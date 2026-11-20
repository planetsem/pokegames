import { describe, expect, it } from "vitest";
import { AREAS, SOLID, pickEncounter, tileAt } from "./maps";

const walkable = (t: string) => !SOLID.has(t);

describe("world maps", () => {
  for (const area of Object.values(AREAS)) {
    describe(area.id, () => {
      it("has rectangular rows", () => {
        const w = area.tiles[0].length;
        area.tiles.forEach((row, y) =>
          expect(row.length, `${area.id} row ${y}`).toBe(w),
        );
      });

      it("has warps that land on walkable tiles", () => {
        for (const w of area.warps) {
          const target = AREAS[w.to];
          expect(target, `${area.id} -> ${w.to}`).toBeDefined();
          expect(
            walkable(tileAt(target, w.tx, w.ty)),
            `${area.id} -> ${w.to} (${w.tx},${w.ty}) = ${tileAt(target, w.tx, w.ty)}`,
          ).toBe(true);
          expect(walkable(tileAt(area, w.x, w.y)), `warp tile ${w.x},${w.y}`).toBe(true);
        }
      });

      it("places npcs and signs sensibly", () => {
        for (const n of area.npcs) {
          // nurses stand behind the counter on floor
          expect(walkable(tileAt(area, n.x, n.y)), `${n.id}`).toBe(true);
        }
        for (const s of area.signs) expect(tileAt(area, s.x, s.y)).toBe("S");
      });
    });
  }

  it("rolls encounters inside the level range", () => {
    for (let i = 0; i < 200; i++) {
      const e = pickEncounter(AREAS.route1)!;
      expect(e.level).toBeGreaterThanOrEqual(2);
      expect(e.level).toBeLessThanOrEqual(5);
    }
  });
});

describe("reachability", () => {
  for (const area of Object.values(AREAS)) {
    it(`${area.id}: every warp is reachable from every entry`, () => {
      const entries = Object.values(AREAS).flatMap((a) =>
        a.warps.filter((w) => w.to === area.id).map((w) => [w.tx, w.ty]),
      );
      const blocked = new Set(area.npcs.map((n) => `${n.x},${n.y}`));
      for (const [sx, sy] of entries) {
        const seen = new Set([`${sx},${sy}`]);
        const q = [[sx, sy]];
        while (q.length) {
          const [x, y] = q.shift()!;
          for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
            const nx = x + dx, ny = y + dy, k = `${nx},${ny}`;
            if (seen.has(k) || blocked.has(k)) continue;
            if (!walkable(tileAt(area, nx, ny)) || ny < 0 || nx < 0 || ny >= area.tiles.length || nx >= area.tiles[0].length) continue;
            seen.add(k); q.push([nx, ny]);
          }
        }
        for (const w of area.warps)
          expect(seen.has(`${w.x},${w.y}`), `${area.id} warp ${w.x},${w.y} from ${sx},${sy}`).toBe(true);
      }
    });
  }
});
