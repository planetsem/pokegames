import { tileAt } from "../data/maps";
import type { Area, CharacterPalette } from "../data/maps";
import type { Facing } from "@/store/app/worldStore";

export const TILE = 16;

type Ctx = CanvasRenderingContext2D;

/** Cheap deterministic noise so grass looks the same every frame. */
const hash = (x: number, y: number, s = 0) => {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

const C = {
  grass: "#7ccf4a",
  grassDark: "#5fb23a",
  grassLight: "#9be36a",
  tall: "#3f9a32",
  tallDark: "#2a7024",
  tallLight: "#6cc24a",
  path: "#ead9a6",
  pathDark: "#d7c08a",
  sand: "#f6e7b0",
  sandDark: "#e6d08d",
  water: "#3b8beb",
  waterLight: "#7dbbff",
  waterDark: "#2f6fc4",
  treeDark: "#1f5a24",
  tree: "#2f7d32",
  treeLight: "#4caf50",
  trunk: "#7a4a24",
  rock: "#8a837c",
  rockDark: "#5f5953",
  rockLight: "#b0a99f",
  caveFloor: "#6b5d52",
  caveDark: "#4e433b",
  caveLight: "#837365",
  roofBlue: "#3d64d8",
  roofBlueDark: "#2a479e",
  roofRed: "#e0413a",
  roofRedDark: "#a92a25",
  wall: "#f3ead6",
  wallDark: "#cfc2a4",
  window: "#8ecdf7",
  door: "#7c4a1e",
  outline: "#2b2b2b",
  inWall: "#d8c49b",
  inWallDark: "#b9a272",
  floorA: "#ecd9ae",
  floorB: "#e0c996",
  counter: "#c2362f",
  wood: "#8b5a2b",
} as const;

const rect = (ctx: Ctx, x: number, y: number, w: number, h: number, c: string) => {
  ctx.fillStyle = c;
  ctx.fillRect(x, y, w, h);
};

function grass(ctx: Ctx, ox: number, oy: number, tx: number, ty: number) {
  rect(ctx, ox, oy, TILE, TILE, C.grass);
  for (let i = 0; i < 5; i++) {
    const gx = Math.floor(hash(tx, ty, i) * 14) + 1;
    const gy = Math.floor(hash(ty, tx, i + 9) * 13) + 2;
    rect(ctx, ox + gx, oy + gy, 1, 2, C.grassDark);
    if (i < 2) rect(ctx, ox + gx + 1, oy + gy - 1, 1, 1, C.grassLight);
  }
}

function tallGrass(ctx: Ctx, ox: number, oy: number, tx: number, ty: number, sway: number) {
  rect(ctx, ox, oy, TILE, TILE, C.tall);
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 4; col++) {
      const bx = ox + col * 4 + (row % 2 ? 2 : 0) + (sway && (col + ty) % 2 ? 1 : 0);
      const by = oy + row * 8 + 2;
      rect(ctx, bx, by + 2, 1, 5, C.tallDark);
      rect(ctx, bx + 1, by, 1, 6, C.tallLight);
      rect(ctx, bx + 2, by + 2, 1, 5, C.tallDark);
    }
  }
  void tx;
}

/** Only the lower blades, painted over a character's legs. */
export function tallGrassOverlay(ctx: Ctx, ox: number, oy: number, ty: number) {
  for (let col = 0; col < 4; col++) {
    const bx = ox + col * 4 + 2;
    const by = oy + 10;
    rect(ctx, bx, by, 1, 6, C.tallDark);
    rect(ctx, bx + 1, by - 1, 1, 7, C.tallLight);
    rect(ctx, bx + 2, by, 1, 6, C.tallDark);
    void ty;
  }
}

function path(ctx: Ctx, ox: number, oy: number, tx: number, ty: number) {
  rect(ctx, ox, oy, TILE, TILE, C.path);
  for (let i = 0; i < 4; i++) {
    const px = Math.floor(hash(tx, ty, i + 3) * 15);
    const py = Math.floor(hash(ty, tx, i + 5) * 15);
    rect(ctx, ox + px, oy + py, 1, 1, C.pathDark);
  }
}

function sand(ctx: Ctx, ox: number, oy: number, tx: number, ty: number) {
  rect(ctx, ox, oy, TILE, TILE, C.sand);
  for (let i = 0; i < 4; i++) {
    const px = Math.floor(hash(tx, ty, i + 13) * 15);
    const py = Math.floor(hash(ty, tx, i + 17) * 15);
    rect(ctx, ox + px, oy + py, 1, 1, C.sandDark);
  }
}

function water(ctx: Ctx, ox: number, oy: number, tx: number, ty: number, frame: number) {
  rect(ctx, ox, oy, TILE, TILE, C.water);
  const shift = frame ? 3 : 0;
  rect(ctx, ox + ((2 + shift + tx * 5) % 12), oy + 4, 4, 1, C.waterLight);
  rect(ctx, ox + ((9 + shift + ty * 3) % 12), oy + 11, 4, 1, C.waterLight);
  rect(ctx, ox + ((5 + shift) % 12), oy + 8, 3, 1, C.waterDark);
}

function tree(ctx: Ctx, ox: number, oy: number, tx: number, ty: number) {
  grass(ctx, ox, oy, tx, ty);
  rect(ctx, ox + 6, oy + 11, 4, 5, C.trunk);
  rect(ctx, ox + 2, oy + 2, 12, 10, C.treeDark);
  rect(ctx, ox + 1, oy + 4, 14, 6, C.treeDark);
  rect(ctx, ox + 3, oy + 3, 10, 7, C.tree);
  rect(ctx, ox + 2, oy + 5, 12, 3, C.tree);
  rect(ctx, ox + 4, oy + 3, 4, 2, C.treeLight);
  rect(ctx, ox + 3, oy + 5, 2, 2, C.treeLight);
}

function palm(ctx: Ctx, ox: number, oy: number, tx: number, ty: number) {
  sand(ctx, ox, oy, tx, ty);
  rect(ctx, ox + 7, oy + 5, 2, 11, C.trunk);
  rect(ctx, ox + 1, oy + 3, 14, 3, C.tree);
  rect(ctx, ox + 4, oy + 1, 8, 2, C.treeLight);
  rect(ctx, ox, oy + 6, 3, 2, C.tree);
  rect(ctx, ox + 13, oy + 6, 3, 2, C.tree);
}

function flowers(ctx: Ctx, ox: number, oy: number, tx: number, ty: number) {
  grass(ctx, ox, oy, tx, ty);
  const spots = [
    [3, 3, "#f43f5e"],
    [10, 5, "#fde047"],
    [5, 10, "#ffffff"],
    [12, 12, "#f43f5e"],
  ] as const;
  for (const [x, y, c] of spots) {
    rect(ctx, ox + x, oy + y, 2, 2, c);
    rect(ctx, ox + x, oy + y + 2, 1, 1, C.grassDark);
  }
}

function sign(ctx: Ctx, ox: number, oy: number, tx: number, ty: number) {
  grass(ctx, ox, oy, tx, ty);
  rect(ctx, ox + 7, oy + 9, 2, 6, C.wood);
  rect(ctx, ox + 2, oy + 3, 12, 7, C.outline);
  rect(ctx, ox + 3, oy + 4, 10, 5, "#c08a4e");
  rect(ctx, ox + 4, oy + 5, 8, 1, "#8b5a2b");
  rect(ctx, ox + 4, oy + 7, 6, 1, "#8b5a2b");
}

function roof(ctx: Ctx, area: Area, ox: number, oy: number, tx: number, ty: number, red: boolean) {
  const ch = tileAt(area, tx, ty);
  const base = red ? C.roofRed : C.roofBlue;
  const dark = red ? C.roofRedDark : C.roofBlueDark;
  rect(ctx, ox, oy, TILE, TILE, base);
  for (let y = 3; y < TILE; y += 5) rect(ctx, ox, oy + y, TILE, 1, dark);
  if (tileAt(area, tx, ty - 1) !== ch) rect(ctx, ox, oy, TILE, 2, dark);
  if (tileAt(area, tx - 1, ty) !== ch) rect(ctx, ox, oy, 1, TILE, dark);
  if (tileAt(area, tx + 1, ty) !== ch) rect(ctx, ox + 15, oy, 1, TILE, dark);
  // Center sign: a white cross on the middle roof tile
  if (red && tileAt(area, tx - 2, ty) === "P" && tileAt(area, tx + 2, ty) === "P" && tileAt(area, tx, ty + 1) !== "P") {
    rect(ctx, ox + 3, oy + 2, 10, 10, "#ffffff");
    rect(ctx, ox + 7, oy + 3, 2, 8, C.roofRed);
    rect(ctx, ox + 4, oy + 6, 8, 2, C.roofRed);
  }
}

function wall(ctx: Ctx, area: Area, ox: number, oy: number, tx: number, ty: number) {
  rect(ctx, ox, oy, TILE, TILE, C.wall);
  rect(ctx, ox, oy + 14, TILE, 2, C.wallDark);
  const left = tileAt(area, tx - 1, ty);
  if (left !== "w" && left !== "p" && left !== "d" && left !== "D") rect(ctx, ox, oy, 1, TILE, C.wallDark);
  const right = tileAt(area, tx + 1, ty);
  if (right !== "w" && right !== "p" && right !== "d" && right !== "D") rect(ctx, ox + 15, oy, 1, TILE, C.wallDark);
  if ((tx + ty) % 2 === 0) {
    rect(ctx, ox + 4, oy + 3, 8, 7, C.outline);
    rect(ctx, ox + 5, oy + 4, 6, 5, C.window);
    rect(ctx, ox + 5, oy + 4, 2, 2, "#d6efff");
    rect(ctx, ox + 7, oy + 4, 1, 5, C.outline);
  }
}

function door(ctx: Ctx, ox: number, oy: number, glass: boolean) {
  rect(ctx, ox, oy, TILE, TILE, C.wall);
  rect(ctx, ox + 3, oy + 2, 10, 14, C.outline);
  rect(ctx, ox + 4, oy + 3, 8, 13, glass ? C.window : C.door);
  if (glass) {
    rect(ctx, ox + 7, oy + 3, 2, 13, C.outline);
  } else {
    rect(ctx, ox + 10, oy + 9, 1, 2, "#fcd34d");
  }
}

function rock(ctx: Ctx, area: Area, ox: number, oy: number, tx: number, ty: number) {
  rect(ctx, ox, oy, TILE, TILE, area.dark ? C.rockDark : C.rock);
  rect(ctx, ox + 1, oy + 1, 6, 6, C.rockLight);
  rect(ctx, ox + 9, oy + 8, 6, 6, C.rockLight);
  rect(ctx, ox + 2, oy + 2, 4, 4, C.rock);
  rect(ctx, ox + 10, oy + 9, 4, 4, C.rock);
  rect(ctx, ox, oy + 15, TILE, 1, C.rockDark);
  void tx;
  void ty;
}

function caveFloor(ctx: Ctx, ox: number, oy: number, tx: number, ty: number, gravel: boolean) {
  rect(ctx, ox, oy, TILE, TILE, gravel ? C.caveDark : C.caveFloor);
  const n = gravel ? 9 : 3;
  for (let i = 0; i < n; i++) {
    const px = Math.floor(hash(tx, ty, i + 21) * 14);
    const py = Math.floor(hash(ty, tx, i + 29) * 14);
    rect(ctx, ox + px, oy + py, gravel ? 2 : 1, gravel ? 2 : 1, gravel ? C.caveLight : C.caveDark);
  }
}

function boulder(ctx: Ctx, ox: number, oy: number, tx: number, ty: number) {
  caveFloor(ctx, ox, oy, tx, ty, false);
  rect(ctx, ox + 2, oy + 3, 12, 11, C.rockDark);
  rect(ctx, ox + 3, oy + 2, 10, 11, C.rock);
  rect(ctx, ox + 4, oy + 3, 4, 3, C.rockLight);
}

function caveMouth(ctx: Ctx, ox: number, oy: number) {
  rect(ctx, ox, oy, TILE, TILE, C.rock);
  rect(ctx, ox + 2, oy + 3, 12, 13, "#0b0b0b");
  rect(ctx, ox + 4, oy + 1, 8, 2, "#0b0b0b");
}

function inWall(ctx: Ctx, ox: number, oy: number) {
  rect(ctx, ox, oy, TILE, TILE, C.inWall);
  rect(ctx, ox, oy + 12, TILE, 4, C.inWallDark);
  rect(ctx, ox, oy, TILE, 1, C.inWallDark);
}

function floor(ctx: Ctx, ox: number, oy: number, tx: number, ty: number) {
  rect(ctx, ox, oy, TILE, TILE, (tx + ty) % 2 ? C.floorA : C.floorB);
  rect(ctx, ox, oy + 15, TILE, 1, C.floorB);
}

function counter(ctx: Ctx, ox: number, oy: number, tx: number, ty: number) {
  floor(ctx, ox, oy, tx, ty);
  rect(ctx, ox, oy + 2, TILE, 12, C.counter);
  rect(ctx, ox, oy + 2, TILE, 4, "#f8fafc");
  rect(ctx, ox, oy + 13, TILE, 1, C.roofRedDark);
}

function shelf(ctx: Ctx, ox: number, oy: number) {
  inWall(ctx, ox, oy);
  rect(ctx, ox + 1, oy + 1, 14, 15, C.wood);
  const books = ["#ef4444", "#3b82f6", "#22c55e", "#eab308", "#a855f7"];
  for (let r = 0; r < 2; r++)
    for (let i = 0; i < 5; i++)
      rect(ctx, ox + 2 + i * 2.6, oy + 2 + r * 7, 2, 5, books[(i + r * 2) % 5]);
}

function plant(ctx: Ctx, ox: number, oy: number, tx: number, ty: number) {
  floor(ctx, ox, oy, tx, ty);
  rect(ctx, ox + 4, oy + 10, 8, 6, "#b45309");
  rect(ctx, ox + 2, oy + 2, 12, 9, C.tree);
  rect(ctx, ox + 4, oy + 3, 4, 3, C.treeLight);
}

function mat(ctx: Ctx, ox: number, oy: number, tx: number, ty: number) {
  floor(ctx, ox, oy, tx, ty);
  rect(ctx, ox + 1, oy + 4, 14, 10, "#b91c1c");
  rect(ctx, ox + 3, oy + 6, 10, 6, "#ef4444");
}

export function drawTile(
  ctx: Ctx,
  area: Area,
  tx: number,
  ty: number,
  ox: number,
  oy: number,
  frame: number,
) {
  const ch = tileAt(area, tx, ty);
  switch (ch) {
    case ".": return grass(ctx, ox, oy, tx, ty);
    case ",": return tallGrass(ctx, ox, oy, tx, ty, frame);
    case "=": return path(ctx, ox, oy, tx, ty);
    case "f": return flowers(ctx, ox, oy, tx, ty);
    case "T": return tree(ctx, ox, oy, tx, ty);
    case "~": return water(ctx, ox, oy, tx, ty, frame);
    case "s": return sand(ctx, ox, oy, tx, ty);
    case "Y": return palm(ctx, ox, oy, tx, ty);
    case "S": return sign(ctx, ox, oy, tx, ty);
    case "r": return roof(ctx, area, ox, oy, tx, ty, false);
    case "P": return roof(ctx, area, ox, oy, tx, ty, true);
    case "w":
    case "p": return wall(ctx, area, ox, oy, tx, ty);
    case "d": return door(ctx, ox, oy, false);
    case "D": return door(ctx, ox, oy, true);
    case "R": return rock(ctx, area, ox, oy, tx, ty);
    case "c": return caveFloor(ctx, ox, oy, tx, ty, false);
    case "g": return caveFloor(ctx, ox, oy, tx, ty, true);
    case "O": return caveMouth(ctx, ox, oy);
    case "X": return boulder(ctx, ox, oy, tx, ty);
    case "W": return inWall(ctx, ox, oy);
    case "o": return floor(ctx, ox, oy, tx, ty);
    case "K": return counter(ctx, ox, oy, tx, ty);
    case "B": return shelf(ctx, ox, oy);
    case "Q": return plant(ctx, ox, oy, tx, ty);
    case "m": return mat(ctx, ox, oy, tx, ty);
    default: return grass(ctx, ox, oy, tx, ty);
  }
}

/** Pre-renders a whole area at 1px per pixel; two frames for water and grass. */
export function renderAreaCache(area: Area, frame: number): HTMLCanvasElement {
  const w = area.tiles[0].length;
  const h = area.tiles.length;
  const c = document.createElement("canvas");
  c.width = w * TILE;
  c.height = h * TILE;
  const ctx = c.getContext("2d")!;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) drawTile(ctx, area, x, y, x * TILE, y * TILE, frame);
  return c;
}

// --- characters -----------------------------------------------------------

const DOWN = [
  "....oooo....",
  "...ohhhho...",
  "..ohhhhhho..",
  "..ohhhhhho..",
  "..okkkkkko..",
  "..okekkeko..",
  "..okkkkkko..",
  "...okkkko...",
  "..osssssso..",
  ".okssssssko.",
  ".okssssssko.",
  "..osssssso..",
  "..oppppppo..",
  "..oppooppo..",
  "..oppooppo..",
  "..ooo..ooo..",
];

const UP = [
  ...DOWN.slice(0, 4),
  "..ohhhhhho..",
  "..ohhhhhho..",
  "..okhhhhko..",
  ...DOWN.slice(7),
];

const RIGHT = [
  "....oooo....",
  "...ohhhho...",
  "..ohhhhhho..",
  "..ohhhhhho..",
  "..ohhkkkko..",
  "..ohkkkeko..",
  "..ohkkkkko..",
  "...okkkko...",
  "...osssso...",
  "...osskso...",
  "...osskso...",
  "...osssso...",
  "...opppo....",
  "...opppo....",
  "...opppo....",
  "...oooo.....",
];

const withLegs = (base: Array<string>, legs: Array<string>) => [
  ...base.slice(0, 16 - legs.length),
  ...legs,
];

const FRAMES: Record<"down" | "up" | "right", Array<Array<string>>> = {
  down: [
    DOWN,
    withLegs(DOWN, ["..oppo.ooo..", "..ooo......."]),
    DOWN,
    withLegs(DOWN, ["..ooo.oppo..", ".......ooo.."]),
  ],
  up: [
    UP,
    withLegs(UP, ["..oppo.ooo..", "..ooo......."]),
    UP,
    withLegs(UP, ["..ooo.oppo..", ".......ooo.."]),
  ],
  right: [
    RIGHT,
    withLegs(RIGHT, ["...oppppo...", "..opo..opo..", "..oo....oo.."]),
    RIGHT,
    withLegs(RIGHT, ["...oppppo...", "..opo..opo..", "..oo....oo.."]),
  ],
};

const spriteCache = new Map<string, HTMLCanvasElement>();

function characterSprite(palette: CharacterPalette, facing: Facing, step: number) {
  const key = `${palette.hair}${palette.shirt}${palette.pants}${facing}${step}`;
  const hit = spriteCache.get(key);
  if (hit) return hit;

  const dir = facing === "left" ? "right" : facing;
  const rows = FRAMES[dir][step % 4];
  const colors: Record<string, string> = {
    o: "#1f2430",
    h: palette.hair,
    k: palette.skin ?? "#f6c9a0",
    e: "#111827",
    s: palette.shirt,
    p: palette.pants,
  };
  const c = document.createElement("canvas");
  c.width = 12;
  c.height = 16;
  const ctx = c.getContext("2d")!;
  rows.forEach((row, y) => {
    for (let x = 0; x < 12; x++) {
      const ch = row[facing === "left" ? 11 - x : x];
      if (ch === ".") continue;
      ctx.fillStyle = colors[ch];
      ctx.fillRect(x, y, 1, 1);
    }
  });
  spriteCache.set(key, c);
  return c;
}

/** Draws a character standing on the tile whose top-left is (ox, oy). */
export function drawCharacter(
  ctx: Ctx,
  palette: CharacterPalette,
  facing: Facing,
  step: number,
  ox: number,
  oy: number,
) {
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.fillRect(ox + 3, oy + 13, 10, 3);
  ctx.drawImage(characterSprite(palette, facing, step), ox + 2, oy - 3);
}

export function drawExclamation(ctx: Ctx, ox: number, oy: number) {
  rect(ctx, ox + 4, oy - 16, 8, 11, C.outline);
  rect(ctx, ox + 5, oy - 15, 6, 9, "#ffffff");
  rect(ctx, ox + 7, oy - 14, 2, 5, "#ef4444");
  rect(ctx, ox + 7, oy - 8, 2, 1, "#ef4444");
}
