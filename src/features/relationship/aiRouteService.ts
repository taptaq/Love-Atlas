import type { MapArea } from '../../types';

export interface AiRouteResult {
  areas: MapArea[];
  reason: string;
}

export async function generateAiRoute(params: {
  stage: string | null;
  goal: string | null;
  language: 'cn' | 'en';
}): Promise<AiRouteResult> {
  const response = await fetch('/api/ai/route', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<AiRouteResult>;
}
