import type { Language, MapArea } from '../../types';

export interface CloudMomentImageResult {
  tags: string[];
  area: MapArea;
  caption: string;
  reason: string;
  source: 'cloud-vlm' | 'fallback';
}

export async function analyzeMomentImageWithCloud(params: {
  imageDataUrl: string;
  fileName: string;
  momentText: string;
  ocrText: string;
  language: Language;
}) {
  const response = await fetch('/api/ai/moment-image', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<CloudMomentImageResult>;
}
