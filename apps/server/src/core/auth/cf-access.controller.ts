// pinup-km fork: sign in with the email Cloudflare Access already verified.
// Enabled only when CF_ACCESS_TEAM_DOMAIN + CF_ACCESS_AUD are set
// (or CF_ACCESS_DEV_EMAIL in development).
import {
  Controller,
  ForbiddenException,
  Get,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import * as jwt from 'jsonwebtoken';
import { Workspace } from '@docmost/db/types/entity.types';
import { AuthWorkspace } from '../../common/decorators/auth-workspace.decorator';
import { UserRepo } from '@docmost/db/repos/user/user.repo';
import { isUserDisabled } from '../../common/helpers';
import { SessionService } from '../session/session.service';
import { EnvironmentService } from '../../integrations/environment/environment.service';

let certCache: { at: number; certs: Record<string, string> } | null = null;

async function accessCerts(team: string): Promise<Record<string, string>> {
  // ponytail: 1h cache; Cloudflare rotates keys every ~6 weeks with overlap
  if (certCache && Date.now() - certCache.at < 3600_000) return certCache.certs;
  const res = await fetch(`https://${team}/cdn-cgi/access/certs`);
  const body = (await res.json()) as { public_certs: { kid: string; cert: string }[] };
  const certs = Object.fromEntries(body.public_certs.map((c) => [c.kid, c.cert]));
  certCache = { at: Date.now(), certs };
  return certs;
}

export function isLocalDev(env: NodeJS.ProcessEnv = process.env): boolean {
  return (
    !!env.CF_ACCESS_DEV_EMAIL &&
    /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/.test(env.APP_URL ?? '')
  );
}

export function accessEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return !!env.CF_ACCESS_TEAM_DOMAIN || isLocalDev(env);
}

export async function emailFromAccess(
  req: FastifyRequest,
  env: NodeJS.ProcessEnv = process.env,
): Promise<string | null> {
  const team = env.CF_ACCESS_TEAM_DOMAIN;
  if (team) {
    if (!env.CF_ACCESS_AUD) throw new Error('CF_ACCESS_AUD required');
    const token = req.headers['cf-access-jwt-assertion'];
    if (typeof token !== 'string') return null;
    const kid = (jwt.decode(token, { complete: true }) as any)?.header?.kid;
    const cert = (await accessCerts(team))[kid];
    if (!cert) return null;
    try {
      const p = jwt.verify(token, cert, {
        algorithms: ['RS256'],
        audience: env.CF_ACCESS_AUD,
        issuer: `https://${team}`,
      }) as jwt.JwtPayload;
      return typeof p.email === 'string' ? p.email.toLowerCase() : null;
    } catch {
      return null;
    }
  }
  // start:prod forces NODE_ENV=production, so dev mode is keyed on a localhost APP_URL
  if (isLocalDev(env)) {
    return env.CF_ACCESS_DEV_EMAIL.toLowerCase();
  }
  return null;
}

@Controller('auth')
export class CfAccessController {
  constructor(
    private userRepo: UserRepo,
    private sessionService: SessionService,
    private environmentService: EnvironmentService,
  ) {}

  @Get('cf-access')
  async signIn(
    @AuthWorkspace() workspace: Workspace,
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
    @Query('redirect') redirect?: string,
  ) {
    const email = await emailFromAccess(req);
    if (!email) throw new UnauthorizedException('Cloudflare Access identity missing');

    const user = await this.userRepo.findByEmail(email, workspace.id);
    if (!user || isUserDisabled(user)) {
      throw new ForbiddenException(`${email} has no account in this wiki. Ask the admin to invite you.`);
    }

    const token = await this.sessionService.createSessionAndToken(user);
    res.setCookie('authToken', token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      expires: this.environmentService.getCookieExpiresIn(),
      secure: this.environmentService.isHttps(),
    });
    // only same-site relative paths, never //evil.com or /\evil.com
    const target = redirect && /^\/(?![/\\])/.test(redirect) ? redirect : '/home';
    return res.redirect(target, 302);
  }
}
