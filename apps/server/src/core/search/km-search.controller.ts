// pinup-km fork: AI search. Forwards the query + the signed-in user's email to the
// pinup-km search service (KM_SEARCH_URL), which filters by that user's Space membership.
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
  Post,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import { User } from '@docmost/db/types/entity.types';

export interface KmSearchResult {
  title: string;
  space: string;
  url: string; // relative Docmost path
  snippet: string;
  score: number;
  drive: { label: string; url: string }[];
}

export function kmSearchEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return !!env.KM_SEARCH_URL && !!env.KM_INTERNAL_KEY;
}

export async function kmSearch(
  email: string,
  query: unknown,
  limit: unknown,
  env: NodeJS.ProcessEnv = process.env,
  fetchFn: typeof fetch = fetch,
): Promise<KmSearchResult[]> {
  const q = typeof query === 'string' ? query.trim().slice(0, 500) : '';
  if (!q) return [];
  const n = Math.min(20, Math.max(1, Number(limit) || 5));
  const url = `${env.KM_SEARCH_URL}/api/search?q=${encodeURIComponent(q)}&limit=${n}`;
  const res = await fetchFn(url, {
    headers: { 'x-km-key': env.KM_INTERNAL_KEY, 'x-km-user': email },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`km search ${res.status}`);
  const rows = (await res.json()) as KmSearchResult[];
  // search returns absolute DOCMOST_URL links; keep the path so the SPA navigates in place
  return rows.map((r) => ({ ...r, url: new URL(r.url, 'http://x').pathname }));
}

@UseGuards(JwtAuthGuard)
@Controller('km')
export class KmSearchController {
  private readonly logger = new Logger(KmSearchController.name);

  @HttpCode(HttpStatus.OK)
  @Post('search')
  async search(@Body() body: { query?: unknown; limit?: unknown }, @AuthUser() user: User) {
    if (!kmSearchEnabled()) throw new NotFoundException();
    try {
      return { items: await kmSearch(user.email, body?.query, body?.limit) };
    } catch (e) {
      this.logger.error(`km search failed: ${(e as Error).message}`);
      throw new ServiceUnavailableException('AI search is unavailable');
    }
  }
}
