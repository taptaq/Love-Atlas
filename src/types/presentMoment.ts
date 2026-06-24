import type { MapArea } from './map';

export type MomentCaptureMode = 'upload' | 'camera' | null;

export type MomentScene =
  | 'coffee'
  | 'night'
  | 'travel'
  | 'home'
  | 'conflict'
  | 'sunset'
  | 'morning'
  | 'celebration'
  | 'cafe'
  | 'room'
  | 'street'
  | '';

export interface RouteInfluence {
  primaryArea: MapArea;
  reason: string;
  weight: number;
}

export interface PresentMomentState {
  scene: MomentScene;
  text: string;
  image: string | null;
  imagePreview: string;
  imageTags: string[];
  imageCaption: string;
  imageUnderstandingSource: 'cloud-vlm' | 'local-ocr' | 'heuristic' | null;
  imageOcrText: string;
  imageOcrConfidence: number | null;
  imageOcrStatus: 'idle' | 'recognizing' | 'done' | 'error';
  captureMode: MomentCaptureMode;
  routeInfluence: RouteInfluence | null;
}
