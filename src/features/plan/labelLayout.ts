/**
 * Greedy label placement for a bubble chart: each label tries above, below, right and left of
 * its bubble (then the diagonals) and takes the first spot that collides with no bubble and no
 * label already placed. If every spot collides, it takes the one with the least overlap.
 */

export interface Bubble {
  id: string;
  x: number;
  y: number;
  r: number;
  /** Rendered label size in chart units. */
  width: number;
  height: number;
}

export interface PlacedLabel {
  id: string;
  /** Text anchor point: horizontal centre, baseline. */
  x: number;
  y: number;
}

interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

const GAP = 4;

export function placeLabels(bubbles: Bubble[], bounds: Box): PlacedLabel[] {
  const placed: Box[] = [];
  // Place the most crowded bubbles first, so isolated ones adapt around them.
  const order = [...bubbles].sort((a, b) => crowding(b, bubbles) - crowding(a, bubbles));
  const result = new Map<string, PlacedLabel>();

  for (const b of order) {
    let best: { box: Box; cost: number } | null = null;
    for (const box of candidates(b)) {
      const cost = outside(box, bounds) * 4 + placed.reduce((s, p) => s + overlap(box, p), 0) + bubbles.reduce((s, o) => s + overlap(box, circleBox(o)), 0);
      if (!best || cost < best.cost) best = { box, cost };
      if (cost === 0) break;
    }
    placed.push(best!.box);
    result.set(b.id, { id: b.id, x: (best!.box.x0 + best!.box.x1) / 2, y: best!.box.y1 - 2 });
  }
  return bubbles.map((b) => result.get(b.id)!);
}

function candidates(b: Bubble): Box[] {
  const { x, y, r, width: w, height: h } = b;
  const at = (cx: number, top: number): Box => ({ x0: cx - w / 2, y0: top, x1: cx + w / 2, y1: top + h });
  const side = r + GAP + w / 2;
  const diag = (r + GAP) * Math.SQRT1_2;
  return [
    at(x, y - r - GAP - h), // above
    at(x, y + r + GAP), // below
    at(x + side, y - h / 2), // right
    at(x - side, y - h / 2), // left
    at(x + diag + w / 2, y - diag - h), // above right
    at(x - diag - w / 2, y - diag - h), // above left
    at(x + diag + w / 2, y + diag), // below right
    at(x - diag - w / 2, y + diag), // below left
  ];
}

function circleBox(b: Bubble): Box {
  return { x0: b.x - b.r, y0: b.y - b.r, x1: b.x + b.r, y1: b.y + b.r };
}

function overlap(a: Box, b: Box): number {
  const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
  const h = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
  return w > 0 && h > 0 ? w * h : 0;
}

function outside(box: Box, bounds: Box): number {
  const area = (box.x1 - box.x0) * (box.y1 - box.y0);
  return area - overlap(box, bounds);
}

function crowding(b: Bubble, all: Bubble[]): number {
  return all.filter((o) => o !== b && Math.hypot(o.x - b.x, o.y - b.y) < (o.r + b.r) * 3).length;
}
