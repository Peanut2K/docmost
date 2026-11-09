import { kmSearch, kmSearchEnabled } from './km-search.controller';

const env = { KM_SEARCH_URL: 'http://search:3300', KM_INTERNAL_KEY: 'k'.repeat(32) } as any;
const row = {
  title: 'Leave',
  space: 'ส่วนกลาง',
  url: 'http://wiki.example.com/s/common/p/leave-abc',
  snippet: 'leave 10 days',
  score: 0.1,
  drive: [],
};
const fakeFetch = (body: unknown, ok = true) =>
  jest.fn(async () => ({ ok, status: ok ? 200 : 500, json: async () => body })) as any;

describe('kmSearch', () => {
  it('sends the key, the user and the encoded query; returns relative urls', async () => {
    const f = fakeFetch([row]);
    const res = await kmSearch('me@x.com', '  ลา พักร้อน ', 3, env, f);
    const [url, init] = f.mock.calls[0];
    expect(url).toBe(`http://search:3300/api/search?q=${encodeURIComponent('ลา พักร้อน')}&limit=3`);
    expect(init.headers).toEqual({ 'x-km-key': env.KM_INTERNAL_KEY, 'x-km-user': 'me@x.com' });
    expect(res[0].url).toBe('/s/common/p/leave-abc');
  });

  it('blank or non-string query returns [] without calling search', async () => {
    const f = fakeFetch([]);
    expect(await kmSearch('me@x.com', '   ', 5, env, f)).toEqual([]);
    expect(await kmSearch('me@x.com', { $ne: 1 }, 5, env, f)).toEqual([]);
    expect(f).not.toHaveBeenCalled();
  });

  it('clamps limit to 1..20 and caps the query at 500 chars', async () => {
    const f = fakeFetch([]);
    await kmSearch('me@x.com', 'x'.repeat(900), 999, env, f);
    const url = new URL(f.mock.calls[0][0]);
    expect(url.searchParams.get('q')).toHaveLength(500);
    expect(url.searchParams.get('limit')).toBe('20');
  });

  it('throws when the search service fails', async () => {
    await expect(kmSearch('me@x.com', 'q', 5, env, fakeFetch({}, false))).rejects.toThrow('km search 500');
  });
});

describe('kmSearchEnabled', () => {
  it('needs both the url and the key', () => {
    expect(kmSearchEnabled(env)).toBe(true);
    expect(kmSearchEnabled({ KM_SEARCH_URL: 'http://search:3300' } as any)).toBe(false);
    expect(kmSearchEnabled({} as any)).toBe(false);
  });
});
