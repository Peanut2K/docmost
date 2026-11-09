import { generateKeyPairSync } from 'node:crypto';
import * as jwt from 'jsonwebtoken';
import {
  accessEnabled,
  emailFromAccess,
  isLocalDev,
  safeRedirect,
} from './cf-access.controller';

const TEAM = 'team.cloudflareaccess.com';
const AUD = 'aud-123';
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const pub = publicKey.export({ type: 'spki', format: 'pem' }).toString();

const sign = (claims: object, opts: jwt.SignOptions = {}) =>
  jwt.sign(claims, privateKey, {
    algorithm: 'RS256',
    keyid: 'k1',
    audience: AUD,
    issuer: `https://${TEAM}`,
    expiresIn: '5m',
    ...opts,
  });
const req = (token?: string) =>
  ({ headers: token ? { 'cf-access-jwt-assertion': token } : {} }) as any;
const prod = { CF_ACCESS_TEAM_DOMAIN: TEAM, CF_ACCESS_AUD: AUD } as any;

beforeAll(() => {
  global.fetch = jest.fn(async () => ({
    json: async () => ({ public_certs: [{ kid: 'k1', cert: pub }] }),
  })) as any;
});

describe('emailFromAccess', () => {
  it('returns the lowercased email from a valid Access JWT', async () => {
    expect(await emailFromAccess(req(sign({ email: 'Me@Gmail.com' })), prod)).toBe('me@gmail.com');
  });

  it('rejects missing, wrong-audience, wrong-issuer, expired and forged tokens', async () => {
    const other = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey;
    const bad = [
      undefined,
      sign({ email: 'a@b.c' }, { audience: 'other-app' }),
      sign({ email: 'a@b.c' }, { issuer: 'https://evil.cloudflareaccess.com' }),
      sign({ email: 'a@b.c' }, { expiresIn: '-1m' }),
      jwt.sign({ email: 'a@b.c' }, other, { algorithm: 'RS256', keyid: 'k1', audience: AUD, issuer: `https://${TEAM}` }),
      sign({ email: 'a@b.c' }, { keyid: 'unknown' }),
    ];
    for (const t of bad) expect(await emailFromAccess(req(t), prod)).toBeNull();
  });

  it('refuses to run with a team domain but no audience', async () => {
    await expect(emailFromAccess(req('x'), { CF_ACCESS_TEAM_DOMAIN: TEAM } as any)).rejects.toThrow();
  });

  it('ignores the dev email when Access is configured', async () => {
    const env = { ...prod, CF_ACCESS_DEV_EMAIL: 'dev@x.com', APP_URL: 'http://localhost:3200' };
    expect(await emailFromAccess(req(), env)).toBeNull();
  });

  it('uses the dev email only on a localhost APP_URL', async () => {
    const dev = { CF_ACCESS_DEV_EMAIL: 'Dev@x.com', APP_URL: 'http://localhost:3200' } as any;
    expect(await emailFromAccess(req(), dev)).toBe('dev@x.com');
    expect(await emailFromAccess(req(), { ...dev, APP_URL: 'https://wiki.example.com' })).toBeNull();
    expect(await emailFromAccess(req(), { ...dev, APP_URL: 'http://localhost.evil.com' })).toBeNull();
  });
});

describe('accessEnabled / isLocalDev', () => {
  it('is off by default and on with a team domain or local dev', () => {
    expect(accessEnabled({} as any)).toBe(false);
    expect(accessEnabled(prod)).toBe(true);
    expect(isLocalDev({ CF_ACCESS_DEV_EMAIL: 'a@b.c', APP_URL: 'http://127.0.0.1:3000' } as any)).toBe(true);
  });
});

describe('safeRedirect', () => {
  it('keeps same-site paths and drops everything else', () => {
    expect(safeRedirect('/s/common/p/x?y=1')).toBe('/s/common/p/x?y=1');
    for (const r of [undefined, '', '//evil.com', '/\\evil.com', 'https://evil.com', 'evil.com']) {
      expect(safeRedirect(r)).toBe('/home');
    }
  });
});
