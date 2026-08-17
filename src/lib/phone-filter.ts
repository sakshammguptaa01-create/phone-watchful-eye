// Post-processing filters that clean up raw COCO-SSD predictions.
//
// Why this exists: COCO-SSD is a general-purpose model. A computer mouse, a
// TV remote or a small dark rectangle in the hand can be mislabelled as
// "cell phone". These filters remove the most common false positives without
// retraining the model.

export type Prediction = { class: string; score: number; bbox: ArrayLike<number> };

function box(b: ArrayLike<number>) {
  return [b[0] ?? 0, b[1] ?? 0, b[2] ?? 0, b[3] ?? 0] as const;
}

// Classes that are visually confused with a phone. If one of these is detected
// in (roughly) the same place with a higher score, the "phone" is a false alarm.
const RIVAL_CLASSES = ["mouse", "remote", "book", "keyboard", "laptop", "tv"];

function iou(a: ArrayLike<number>, b: ArrayLike<number>) {
  const [ax, ay, aw, ah] = box(a);
  const [bx, by, bw, bh] = box(b);
  const x1 = Math.max(ax, bx);
  const y1 = Math.max(ay, by);
  const x2 = Math.min(ax + aw, bx + bw);
  const y2 = Math.min(ay + ah, by + bh);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  if (inter <= 0) return 0;
  return inter / (aw * ah + bw * bh - inter);
}

export type FilterOptions = {
  threshold: number;
  strict: boolean;
  frameWidth: number;
  frameHeight: number;
  /** Long-range mode relaxes the size/shape gates so distant phones survive. */
  longRange?: boolean;
};

export function filterPhones<T extends Prediction>(preds: T[], opts: FilterOptions): T[] {
  const { threshold, strict, frameWidth, frameHeight, longRange = false } = opts;
  const frameArea = Math.max(1, frameWidth * frameHeight);

  return preds.filter((p) => {
    if (p.class !== "cell phone") return false;

    const [, , w, h] = box(p.bbox);
    if (w <= 0 || h <= 0) return false;

    const areaFrac = (w * h) / frameArea;
    // A far-away phone is tiny in frame; the model is naturally less confident
    // about it, so we allow a lower score for small boxes in long-range mode.
    const isFar = areaFrac < 0.02;
    const effectiveThreshold = longRange && isFar ? Math.max(0.3, threshold * 0.6) : threshold;
    if (p.score < effectiveThreshold) return false;

    // 1. Rival suppression — a better-scoring mouse/remote/book on the same spot wins.
    const beaten = preds.some(
      (o) =>
        o !== p &&
        RIVAL_CLASSES.includes(o.class) &&
        o.score >= p.score * 0.9 &&
        iou(p.bbox, o.bbox) > 0.4,
    );
    if (beaten) return false;

    if (!strict) return true;

    // 2. Shape gate — a phone is a clear rectangle; a mouse is closer to square/oval.
    // Distant/angled phones look squarer, so the gate widens in long-range mode.
    const ratio = Math.max(w, h) / Math.min(w, h);
    const minRatio = longRange ? 1.2 : 1.45;
    const maxRatio = longRange ? 5 : 4;
    if (ratio < minRatio || ratio > maxRatio) return false;

    // 3. Size gate — ignore specks that are too small to judge reliably.
    if (areaFrac < (longRange ? 0.0004 : 0.004)) return false;

    // 4. Confidence floor in strict mode (relaxed for small far-away boxes).
    const floor = longRange && isFar ? 0.35 : 0.6;
    if (p.score < Math.max(effectiveThreshold, floor)) return false;

    return true;
  });
}

