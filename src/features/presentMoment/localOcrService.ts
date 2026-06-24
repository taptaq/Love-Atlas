import type { createWorker } from 'tesseract.js';

type OcrWorker = Awaited<ReturnType<typeof createWorker>>;

export interface LocalOcrResult {
  text: string;
  confidence: number;
}

let workerPromise: Promise<OcrWorker> | null = null;

function normalizeOcrText(text: string) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/[|]/g, '')
    .trim()
    .slice(0, 500);
}

async function getWorker() {
  if (!workerPromise) {
    const { createWorker, OEM, PSM } = await import('tesseract.js');
    workerPromise = createWorker(['chi_sim', 'eng'], OEM.LSTM_ONLY, {
      workerPath: '/ocr/worker/worker.min.js',
      corePath: '/ocr/core/tesseract-core-lstm.wasm.js',
      langPath: '/ocr/tessdata/',
      workerBlobURL: false,
      gzip: true,
    }).then(async (worker) => {
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SPARSE_TEXT,
        preserve_interword_spaces: '1',
      });
      return worker;
    });
  }
  return workerPromise;
}

export async function recognizeMomentImageText(image: File | Blob | string): Promise<LocalOcrResult> {
  const worker = await getWorker();
  const { data } = await worker.recognize(image);
  return {
    text: normalizeOcrText(data.text ?? ''),
    confidence: Math.round(data.confidence ?? 0),
  };
}
