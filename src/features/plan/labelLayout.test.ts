import { describe, expect, it } from "vitest";
import { placeLabels, type Bubble } from "./labelLayout";

const bounds = { x0: 0, y0: 0, x1: 640, y1: 300 };
const bubble = (id: string, x: number, y: number): Bubble => ({ id, x, y, r: 18, width: 50, height: 12 });

function boxes(bubbles: Bubble[]) {
  return placeLabels(bubbles, bounds).map((l, i) => ({
    x0: l.x - bubbles[i]!.width / 2,
    x1: l.x + bubbles[i]!.width / 2,
    y0: l.y + 2 - bubbles[i]!.height,
    y1: l.y + 2,
  }));
}

describe("placeLabels", () => {
  it("puts a lone label above its bubble", () => {
    const [label] = placeLabels([bubble("a", 300, 150)], bounds);
    expect(label!.x).toBe(300);
    expect(label!.y).toBeLessThan(150 - 18);
  });

  it("keeps labels of clustered bubbles from overlapping each other", () => {
    const cluster = [bubble("mustard", 200, 80), bubble("lentil", 205, 100), bubble("chickpea", 225, 98)];
    const placed = boxes(cluster);
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        const a = placed[i]!;
        const b = placed[j]!;
        const overlaps = a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
        expect(overlaps, `${cluster[i]!.id} vs ${cluster[j]!.id}`).toBe(false);
      }
    }
  });

  it("moves a label below a bubble at the top edge", () => {
    const [label] = placeLabels([bubble("top", 300, 10)], bounds);
    expect(label!.y).toBeGreaterThan(10);
  });
});
