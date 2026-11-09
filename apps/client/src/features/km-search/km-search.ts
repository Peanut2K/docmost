// pinup-km fork: AI search over the pinup-km search service (see server km-search.controller.ts).
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api-client";

export interface KmSearchResult {
  title: string;
  space: string;
  url: string;
  snippet: string;
  score: number;
  drive: { label: string; url: string }[];
}

export const kmSearchEnabled = () => String(window.CONFIG?.KM_SEARCH) === "true";

export async function kmSearch(query: string, limit: number): Promise<KmSearchResult[]> {
  const req = await api.post<{ items: KmSearchResult[] }>("/km/search", { query, limit });
  return req.data.items;
}

export function useKmSearch(query: string, limit: number, enabled = true) {
  const q = query.trim();
  return useQuery({
    queryKey: ["km-search", q, limit],
    queryFn: () => kmSearch(q, limit),
    enabled: enabled && kmSearchEnabled() && q.length > 0,
    staleTime: 60_000,
    retry: false,
  });
}
