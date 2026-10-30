import { describe, expect, test } from "vitest";
import { cellKey, parseMap } from "../core/world.ts";
import { buildScenery, cellHash } from "./scenery.ts";

const rows = [
  "##########",
  "##########",
  "#S......F#",
  "##########",
  "##########",
];
const world = parseMap(rows);
const inside = (x: number, y: number) =>
  x >= 0 && y >= 0 && x < world.width && y < world.height;
const treeCells = (trees: ReadonlyArray<{ x: number; y: number }>) =>
  trees.flatMap(({ x, y }) => [
    cellKey(x, y),
    cellKey(x + 1, y),
    cellKey(x, y + 1),
    cellKey(x + 1, y + 1),
  ]);

describe("buildScenery", () => {
  test("the map has about twice the cells of the level in each direction", () => {
    const { view } = buildScenery(world);
    expect(view).toEqual({ x: -5, y: -3, width: 20, height: 11 });
  });

  test("every wall cell of the level gets either a tree or one obstacle", () => {
    const { trees, obstacles } = buildScenery(world);
    const covered = [
      ...treeCells(trees),
      ...obstacles.map(({ x, y }) => cellKey(x, y)),
    ];
    expect(new Set(covered).size).toBe(covered.length);
    const insideCovered = covered.filter((key) => {
      const [x, y] = key.split(",").map(Number);
      return inside(x ?? -1, y ?? -1);
    });
    expect(new Set(insideCovered)).toEqual(world.walls);
  });

  test("nothing but petals lies on the path, and nothing on the finish", () => {
    const { trees, decor } = buildScenery(world);
    const floor = new Set(treeCells(trees));
    for (const { x, y, kind } of decor) {
      expect(floor.has(cellKey(x, y))).toBe(false);
      if (!inside(x, y)) continue;
      expect(world.walls.has(cellKey(x, y))).toBe(false);
      expect(kind).toBe("petals");
      expect({ x, y }).not.toEqual(world.finish);
    }
  });

  test("the meadow around the level gets trees and flowers", () => {
    const { trees, decor } = buildScenery(world);
    expect(trees.some(({ x, y }) => !inside(x, y))).toBe(true);
    expect(decor.some(({ x, y }) => !inside(x, y))).toBe(true);
  });

  test("the same map always gets the same scenery", () => {
    expect(buildScenery(world)).toEqual(buildScenery(parseMap(rows)));
  });
});

describe("cellHash", () => {
  test("differs for neighbouring cells", () => {
    expect(cellHash(0, 0)).not.toBe(cellHash(1, 0));
    expect(cellHash(0, 0)).not.toBe(cellHash(0, 1));
  });
});
