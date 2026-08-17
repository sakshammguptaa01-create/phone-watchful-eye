// Multi-scale ("long range") detection helper.
//
// COCO-SSD resizes every input to ~300x300 px. A phone held far from the
// camera shrinks to a few pixels after that resize and is never detected.
// Instead of retraining the model, we run it several times per frame:
//   1. once on the whole frame (normal / near detections)
//   2. once on each overlapping tile of the frame, upscaled back to a
//      detector-friendly size (far / small detections)
// Boxes from the tiles are mapped back into full-frame coordinates and merged
// with non-maximum suppression. This is the standard "tiled inference" trick
// used for small-object detection.

import type { Prediction } from "./phone-filter";

export type DetectSource = HTMLVideoElement | HTMLImageElement | HTMLCanvasElement;

export type Detector = {
  detect: (
    img: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
    maxNumBoxes?: number,
    minScore?: number,
  ) => Promise<Prediction[]>;
};

type Tile = { x: number; y: number; w: number; h: number };

// 2x2 overlapping tiles + a centre tile. Overlap prevents a phone that sits on
// a tile border from being cut in half.
function tilesFor(width: number, height: number): Tile[] {
  const w = width * 0.6;
  const h = height * 0.6;
  const cx = (width - w) / 2;
  const cy = (height - h) / 2;
  return [
    { x: 0, y: 0, w, h },
    { x: width - w, y: 0, w, h },
    { x: 0, y: height - h, w, h },
    { x: width - w, y: height - h, w, h },
    { x: cx, y: cy, w, h },
  ];
}

function iou(a: ArrayLike<number>, b: ArrayLike<number>) {
  const ax = a[0] ?? 0,
    ay = a[1] ?? 0,
    aw = a[2] ?? 0,
    ah = a[3] ?? 0;
  const bx = b[0] ?? 0,
    by = b[1] ?? 0,
    bw = b[2] ?? 0,
    bh = b[3] ?? 0;
  const x1 = Math.max(ax, bx);
  const y1 = Math.max(ay, by);
  const x2 = Math.min(ax + aw, bx + bw);
  const y2 = Math.min(ay + ah, by + bh);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  if (inter <= 0) return 0;
  return inter / (aw * ah + bw * bh - inter);
}

// Keep the best-scoring box whenever two detections of the same class overlap.
export function nms(preds: Prediction[], threshold = 0.45): Prediction[] {
  const sorted = [...preds].sort((a, b) => b.score - a.score);
  const kept: Prediction[] = [];
  for (const p of sorted) {
    if (kept.some((k) => k.class === p.class && iou(k.bbox, p.bbox) > threshold)) continue;
    kept.push(p);
  }
  return kept;
}

// Scratch canvas reused across frames so we don't allocate every tick.
let scratch: HTMLCanvasElement | null = null;
function getScratch(w: number, h: number) {
  if (!scratch) scratch = document.createElement("canvas");
  scratch.width = w;
  scratch.height = h;
  return scratch;
}

export type MultiScaleOptions = {
  width: number;
  height: number;
  /** Run the extra tile passes (slower, but sees far-away phones). */
  longRange: boolean;
  /** Lowest score the raw model is allowed to report. */
  minScore?: number;
};

export async function detectMultiScale(
  model: Detector,
  source: DetectSource,
  opts: MultiScaleOptions,
): Promise<Prediction[]> {
  const { width, height, longRange, minScore = 0.2 } = opts;
  const all: Prediction[] = await model.detect(source, 20, minScore);

  if (!longRange || width < 2 || height < 2) return nms(all);

  // Upscale each tile to 480px on the long edge before feeding the detector —
  // this is what makes a distant phone large enough to be recognised.
  const target = 480;
  for (const t of tilesFor(width, height)) {
    const scale = target / Math.max(t.w, t.h);
    const cw = Math.max(1, Math.round(t.w * scale));
    const ch = Math.max(1, Math.round(t.h * scale));
    const canvas = getScratch(cw, ch);
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(source, t.x, t.y, t.w, t.h, 0, 0, cw, ch);

    let tilePreds: Prediction[] = [];
    try {
      tilePreds = await model.detect(canvas, 10, minScore);
    } catch {
      continue;
    }

    for (const p of tilePreds) {
      const [bx = 0, by = 0, bw = 0, bh = 0] = Array.from(p.bbox);
      all.push({
        ...p,
        bbox: [t.x + bx / scale, t.y + by / scale, bw / scale, bh / scale] as [
          number,
          number,
          number,
          number,
        ],
      });
    }
  }

  return nms(all);
}
