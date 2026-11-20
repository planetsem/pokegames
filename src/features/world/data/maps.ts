import type { Facing } from "@/store/app/worldStore";

/**
 * Tile legend (one character per 16x16 tile):
 *  .  grass            ,  tall grass (wild encounters)   =  path
 *  f  flowers          T  tree (solid)                    ~  water (solid)
 *  s  sand             Y  palm tree (solid)               S  sign (solid)
 *  r  house roof       w  house wall                      d  house door
 *  P  center roof      p  center wall                     D  center door
 *  R  rock (solid)     c  cave floor                      g  cave gravel (wild encounters)
 *  O  cave mouth       X  boulder (solid)
 *  W  inside wall      o  inside floor                    K  counter (solid)
 *  B  bookshelf        Q  plant (solid)                   m  exit mat
 */
export type Tile = string;

export const SOLID = new Set("T~YSrwPpRXWKBQ".split(""));
export const ENCOUNTER_TILES = new Set([",", "g"]);

export interface Warp {
  x: number;
  y: number;
  to: string;
  tx: number;
  ty: number;
  facing: Facing;
}

export interface TrainerInfo {
  id: string;
  title: string;
  /** PokeAPI ids, sent out in order. */
  team: Array<number>;
  levels: Array<number>;
  sight: number;
  before: Array<string>;
  after: Array<string>;
}

export type NpcRole = "talk" | "nurse" | "professor";

export interface Npc {
  id: string;
  name: string;
  x: number;
  y: number;
  facing: Facing;
  palette: CharacterPalette;
  role?: NpcRole;
  dialog: Array<string>;
  trainer?: TrainerInfo;
  /** Turns to a random direction every few seconds. */
  looksAround?: boolean;
}

export interface CharacterPalette {
  hair: string;
  shirt: string;
  pants: string;
  skin?: string;
}

export interface Sign {
  x: number;
  y: number;
  text: Array<string>;
}

export interface Encounter {
  id: number;
  weight: number;
}

export interface Area {
  id: string;
  name: string;
  tiles: Array<string>;
  warps: Array<Warp>;
  npcs: Array<Npc>;
  signs: Array<Sign>;
  encounters?: { table: Array<Encounter>; min: number; max: number };
  dark?: boolean;
  indoor?: boolean;
  /** Healing here makes this the respawn point. */
  respawnHere?: { x: number; y: number };
  /** Rows a player without Pokemon may not walk into. */
  needsPokemonBelowY?: number;
  music?: string;
}

const P = {
  professor: { hair: "#d6d3d1", shirt: "#f5f5f4", pants: "#57534e" },
  nurse: { hair: "#f472b6", shirt: "#fdf2f8", pants: "#fbcfe8" },
  youngster: { hair: "#78350f", shirt: "#2563eb", pants: "#facc15" },
  lass: { hair: "#ea580c", shirt: "#db2777", pants: "#1e3a8a" },
  hiker: { hair: "#3f3f46", shirt: "#a16207", pants: "#4d7c0f" },
  swimmer: { hair: "#0ea5e9", shirt: "#06b6d4", pants: "#0e7490" },
  oldman: { hair: "#e7e5e4", shirt: "#65a30d", pants: "#44403c" },
  mom: { hair: "#7c2d12", shirt: "#f97316", pants: "#7c3aed" },
  kid: { hair: "#111827", shirt: "#16a34a", pants: "#1d4ed8" },
  fisher: { hair: "#1f2937", shirt: "#0f766e", pants: "#78716c" },
  girl: { hair: "#facc15", shirt: "#a855f7", pants: "#1e293b" },
} satisfies Record<string, CharacterPalette>;

export const PLAYER_PALETTE: CharacterPalette = {
  hair: "#dc2626",
  shirt: "#1d4ed8",
  pants: "#1f2937",
};

const nurse = (id: string): Npc => ({
  id,
  name: "Nurse",
  x: 5,
  y: 1,
  facing: "down",
  palette: P.nurse,
  role: "nurse",
  dialog: [
    "Welcome to the Pokemon Center!",
    "Your Pokemon are fully rested. We hope to see you again!",
  ],
});

const CENTER_TILES = [
  "WWWWWWWWWWW",
  "WoooooooooW",
  "WooKKKKKooW",
  "WoooooooooW",
  "WQoooooooQW",
  "WoooooooooW",
  "WoooooooooW",
  "WWWWWmWWWWW",
];

const HOUSE_TILES = [
  "WWWWWWWWW",
  "WoooooooW",
  "WBBoooQoW",
  "WoooooooW",
  "WoooooooW",
  "WoooooooW",
  "WWWWmWWWW",
];

const center = (
  id: string,
  name: string,
  back: { to: string; x: number; y: number },
): Area => ({
  id,
  name,
  indoor: true,
  tiles: CENTER_TILES,
  warps: [{ x: 5, y: 7, to: back.to, tx: back.x, ty: back.y, facing: "down" }],
  npcs: [nurse(`${id}-nurse`)],
  signs: [],
  respawnHere: { x: back.x, y: back.y },
});

const house = (
  id: string,
  name: string,
  back: { to: string; x: number; y: number },
  npcs: Array<Npc>,
): Area => ({
  id,
  name,
  indoor: true,
  tiles: HOUSE_TILES,
  warps: [{ x: 4, y: 6, to: back.to, tx: back.x, ty: back.y, facing: "down" }],
  npcs,
  signs: [],
});

export const AREAS: Record<string, Area> = {
  hilltown: {
    id: "hilltown",
    name: "Hilltown",
    needsPokemonBelowY: 1,
    tiles: [
      "TTTTTTTTTTT==TTTTTTTTTTT",
      "TTTTTTTTTTT==TTTTTTTTTTT",
      "TT.........==.........TT",
      "TT.rrrr....==...PPPPP.TT",
      "TT.rrrr....==...PPPPP.TT",
      "TT.wwdw....==...ppDpp.TT",
      "TT...=.....==.....=...TT",
      "TT...==============...TT",
      "TT.f.......==......f..TT",
      "TT.ff......==.....fff.TT",
      "TT.........==.........TT",
      "TT.rrrr....==...rrrr..TT",
      "TT.rrrr..S.==...rrrr..TT",
      "TT.wdww....==...wwdw..TT",
      "TT..=......==.....=...TT",
      "TT..===============...TT",
      "TT.........==.........TT",
      "TT~~~~~....==....~~~~~TT",
      "TT~~~~~..........~~~~~TT",
      "TTTTTTTTTTTTTTTTTTTTTTTT",
    ],
    warps: [
      { x: 11, y: 0, to: "route1", tx: 9, ty: 18, facing: "up" },
      { x: 12, y: 0, to: "route1", tx: 10, ty: 18, facing: "up" },
      { x: 5, y: 5, to: "lab", tx: 4, ty: 5, facing: "up" },
      { x: 18, y: 5, to: "hill-center", tx: 5, ty: 6, facing: "up" },
      { x: 4, y: 13, to: "hill-house-a", tx: 4, ty: 5, facing: "up" },
      { x: 18, y: 13, to: "hill-house-b", tx: 4, ty: 5, facing: "up" },
    ],
    npcs: [
      {
        id: "hill-girl",
        name: "Girl",
        x: 8,
        y: 9,
        facing: "down",
        palette: P.girl,
        looksAround: true,
        dialog: [
          "Professor Hazel's lab is the house in the top left.",
          "She gives every new trainer their first Pokemon!",
        ],
      },
      {
        id: "hill-kid",
        name: "Kid",
        x: 15,
        y: 16,
        facing: "left",
        palette: P.kid,
        looksAround: true,
        dialog: [
          "The red roof is the Pokemon Center.",
          "If you lose a battle, you wake up at the last Center you visited.",
        ],
      },
    ],
    signs: [
      {
        x: 9,
        y: 12,
        text: ["HILLTOWN", "Where every journey starts."],
      },
    ],
  },

  lab: house("lab", "Hazel's Lab", { to: "hilltown", x: 5, y: 6 }, [
    {
      id: "professor",
      name: "Prof. Hazel",
      x: 4,
      y: 2,
      facing: "down",
      palette: P.professor,
      role: "professor",
      dialog: [
        "How is your team doing? Tall grass on Route 1 is full of wild Pokemon.",
        "Beat the trainers you meet to make your team stronger!",
      ],
    },
  ]),

  "hill-center": center("hill-center", "Pokemon Center", {
    to: "hilltown",
    x: 18,
    y: 6,
  }),

  "hill-house-a": house("hill-house-a", "House", { to: "hilltown", x: 4, y: 14 }, [
    {
      id: "hill-mom",
      name: "Neighbour",
      x: 2,
      y: 4,
      facing: "right",
      palette: P.mom,
      dialog: [
        "Walk through tall grass and wild Pokemon will jump out.",
        "Win the battle and you can try to catch them!",
      ],
    },
  ]),

  "hill-house-b": house("hill-house-b", "House", { to: "hilltown", x: 18, y: 14 }, [
    {
      id: "hill-oldman",
      name: "Old Man",
      x: 6,
      y: 4,
      facing: "left",
      palette: P.oldman,
      dialog: [
        "Trainers challenge you the moment they spot you.",
        "Stay out of their line of sight if your team is tired!",
      ],
    },
  ]),

  route1: {
    id: "route1",
    name: "Route 1",
    tiles: [
      "TTTTTTTTT==TTTTTTTTT",
      "TT,,,,...==...,,,,TT",
      "TT,,,,...==...,,,,TT",
      "TT.......==.......TT",
      "TT...TT..==..TT...TT",
      "TT...TT..==..TT...TT",
      "TT,,,,,,.==.,,,,,,TT",
      "TT,,,,,,.==.,,,,,,TT",
      "TT,,,,,,.==.,,,,,,TT",
      "TT.......==.......TT",
      "TT.......==...RRRRRT",
      "TT.......=======ORRT",
      "TT.S.....==...RRRRRT",
      "TT.......==.......TT",
      "TT,,,,,..==..,,,,,TT",
      "TT,,,,,..==..,,,,,TT",
      "TT,,,,,..==..,,,,,TT",
      "TT.......==.......TT",
      "TTTTT....==....TTTTT",
      "TTTTT....==....TTTTT",
    ],
    warps: [
      { x: 9, y: 19, to: "hilltown", tx: 11, ty: 1, facing: "down" },
      { x: 10, y: 19, to: "hilltown", tx: 12, ty: 1, facing: "down" },
      { x: 9, y: 0, to: "seabreeze", tx: 11, ty: 16, facing: "up" },
      { x: 10, y: 0, to: "seabreeze", tx: 12, ty: 16, facing: "up" },
      { x: 16, y: 11, to: "cave", tx: 2, ty: 12, facing: "right" },
    ],
    encounters: {
      min: 2,
      max: 5,
      table: [
        { id: 16, weight: 20 },
        { id: 19, weight: 20 },
        { id: 10, weight: 12 },
        { id: 13, weight: 12 },
        { id: 43, weight: 10 },
        { id: 69, weight: 10 },
        { id: 161, weight: 8 },
        { id: 263, weight: 8 },
        { id: 25, weight: 2 },
      ],
    },
    npcs: [
      {
        id: "r1-tim",
        name: "Youngster Tim",
        x: 12,
        y: 4,
        facing: "left",
        palette: P.youngster,
        dialog: [],
        trainer: {
          id: "r1-tim",
          title: "Youngster Tim",
          team: [16, 19],
          levels: [3, 4],
          sight: 3,
          before: ["Hey! You look like a new trainer.", "Let's battle!"],
          after: ["Wow, you're good! I'll train harder."],
        },
      },
      {
        id: "r1-mia",
        name: "Lass Mia",
        x: 8,
        y: 15,
        facing: "right",
        palette: P.lass,
        dialog: [],
        trainer: {
          id: "r1-mia",
          title: "Lass Mia",
          team: [43, 10],
          levels: [4, 5],
          sight: 3,
          before: ["My Pokemon are the cutest AND the strongest!"],
          after: ["Okay, they are just the cutest then..."],
        },
      },
    ],
    signs: [
      {
        x: 3,
        y: 12,
        text: ["ROUTE 1", "North: Seabreeze   East: Echo Cave   South: Hilltown"],
      },
    ],
  },

  cave: {
    id: "cave",
    name: "Echo Cave",
    dark: true,
    tiles: [
      "RRRRRRRRRRRRRRRRRRRR",
      "RccccccRRRRccccccccR",
      "RcggggcccccccggggccR",
      "RcggggcRRRccRggggccR",
      "RccccccRXRccRccccccR",
      "RRRccRRRcccccccRRccR",
      "RgggcccccccggggcRccR",
      "RgggcRRRcccggggccccR",
      "RcccccXRcccccccRRccR",
      "RccRRRRRRRccRRRRcccR",
      "RccccggggcccccccccgR",
      "RcccXggggcccRRRccggR",
      "ROcccccccccccRRccccR",
      "RRRRRRRRRRRRRRRRRRRR",
    ],
    warps: [{ x: 1, y: 12, to: "route1", tx: 15, ty: 11, facing: "left" }],
    encounters: {
      min: 7,
      max: 11,
      table: [
        { id: 41, weight: 30 },
        { id: 74, weight: 25 },
        { id: 66, weight: 12 },
        { id: 50, weight: 12 },
        { id: 46, weight: 12 },
        { id: 95, weight: 5 },
        { id: 35, weight: 4 },
      ],
    },
    npcs: [
      {
        id: "cave-bram",
        name: "Hiker Bram",
        x: 10,
        y: 6,
        facing: "down",
        palette: P.hiker,
        dialog: [],
        trainer: {
          id: "cave-bram",
          title: "Hiker Bram",
          team: [74, 95],
          levels: [8, 9],
          sight: 3,
          before: ["Rocks don't move, and neither do I!", "Show me your strength!"],
          after: ["Ha! You crushed me like gravel."],
        },
      },
      {
        id: "cave-sara",
        name: "Explorer Sara",
        x: 17,
        y: 10,
        facing: "left",
        palette: P.lass,
        dialog: [],
        trainer: {
          id: "cave-sara",
          title: "Explorer Sara",
          team: [41, 66, 50],
          levels: [9, 9, 10],
          sight: 4,
          before: ["Nobody leaves this cave without a battle!"],
          after: ["You can go... the way out is to the west."],
        },
      },
    ],
    signs: [],
  },

  seabreeze: {
    id: "seabreeze",
    name: "Seabreeze",
    tiles: [
      "TTTTTTTTTTTTTTTTTTTTTTTT",
      "TT....................TT",
      "TT.PPPPP......rrrr....TT",
      "TT.PPPPP......rrrr....TT",
      "TT.ppDpp......wdww....TT",
      "TT...=.........=......TT",
      "TT...===================",
      "TT.f.......==.......f.==",
      "TT.ff......==......ff.TT",
      "TT.........==.........TT",
      "TT..rrrr...==..S......TT",
      "TT..rrrr...==.........TT",
      "TT..wwdw...==.........TT",
      "TT....=....==.........TT",
      "TT....======..........TT",
      "TT.........==.........TT",
      "TTTTTTTTTTT==TTTTTTTTTTT",
      "TTTTTTTTTTT==TTTTTTTTTTT",
    ],
    warps: [
      { x: 11, y: 17, to: "route1", tx: 9, ty: 1, facing: "down" },
      { x: 12, y: 17, to: "route1", tx: 10, ty: 1, facing: "down" },
      { x: 23, y: 6, to: "beach", tx: 1, ty: 3, facing: "right" },
      { x: 23, y: 7, to: "beach", tx: 1, ty: 4, facing: "right" },
      { x: 5, y: 4, to: "sea-center", tx: 5, ty: 6, facing: "up" },
      { x: 15, y: 4, to: "sea-house-a", tx: 4, ty: 5, facing: "up" },
      { x: 6, y: 12, to: "sea-house-b", tx: 4, ty: 5, facing: "up" },
    ],
    npcs: [
      {
        id: "sea-fisher",
        name: "Fisherman",
        x: 18,
        y: 9,
        facing: "down",
        palette: P.fisher,
        looksAround: true,
        dialog: [
          "Sunny Beach is just east of town.",
          "Water Pokemon hide in the dune grass there!",
        ],
      },
    ],
    signs: [
      { x: 15, y: 10, text: ["SEABREEZE", "A salty breeze, a fresh start."] },
    ],
  },

  "sea-center": center("sea-center", "Pokemon Center", {
    to: "seabreeze",
    x: 5,
    y: 5,
  }),

  "sea-house-a": house("sea-house-a", "House", { to: "seabreeze", x: 15, y: 5 }, [
    {
      id: "sea-granny",
      name: "Granny",
      x: 2,
      y: 4,
      facing: "right",
      palette: P.oldman,
      dialog: [
        "Echo Cave is south of here, east of Route 1.",
        "Rock Pokemon live there. Bring a strong team!",
      ],
    },
  ]),

  "sea-house-b": house("sea-house-b", "House", { to: "seabreeze", x: 6, y: 13 }, [
    {
      id: "sea-kid",
      name: "Boy",
      x: 5,
      y: 3,
      facing: "down",
      palette: P.kid,
      looksAround: true,
      dialog: [
        "Your progress saves on this device automatically.",
        "Make an account and your team follows you to any device!",
      ],
    },
  ]),

  beach: {
    id: "beach",
    name: "Sunny Beach",
    tiles: [
      "TTTTTTTTTTTTTTTTTTTTTT",
      "T,,,,ssssssY,,,,ssssTT",
      "T,,,,ssssssss,,,,sss~~",
      "=sssssssYsssssssssss~~",
      "=sssssssssss,,,,ss~~~~",
      "Tss,,,,ssssss,,,,s~~~~",
      "Tss,,,,sssssssssss~~~~",
      "TssssssssssYsssss~~~~~",
      "Tsss,,,,sssssss~~~~~~~",
      "Tsss,,,,sssss~~~~~~~~~",
      "Tssssssssss~~~~~~~~~~~",
      "T~~~~~~~~~~~~~~~~~~~~~",
    ],
    warps: [
      { x: 0, y: 3, to: "seabreeze", tx: 22, ty: 6, facing: "left" },
      { x: 0, y: 4, to: "seabreeze", tx: 22, ty: 7, facing: "left" },
    ],
    encounters: {
      min: 10,
      max: 14,
      table: [
        { id: 72, weight: 22 },
        { id: 98, weight: 20 },
        { id: 90, weight: 14 },
        { id: 120, weight: 12 },
        { id: 118, weight: 12 },
        { id: 183, weight: 10 },
        { id: 79, weight: 8 },
        { id: 131, weight: 2 },
      ],
    },
    npcs: [
      {
        id: "beach-lina",
        name: "Swimmer Lina",
        x: 12,
        y: 6,
        facing: "left",
        palette: P.swimmer,
        dialog: [],
        trainer: {
          id: "beach-lina",
          title: "Swimmer Lina",
          team: [120, 116, 121],
          levels: [12, 12, 14],
          sight: 4,
          before: ["The sea makes my Pokemon unstoppable!"],
          after: ["Guess I need to swim a few more laps..."],
        },
      },
      {
        id: "beach-guy",
        name: "Surfer",
        x: 6,
        y: 3,
        facing: "down",
        palette: P.youngster,
        looksAround: true,
        dialog: [
          "Rumour says a rare Pokemon washes up here sometimes.",
          "Keep walking through the dune grass!",
        ],
      },
    ],
    signs: [],
  },
};

export const tileAt = (area: Area, x: number, y: number): Tile =>
  area.tiles[y]?.[x] ?? "T";

export const pickEncounter = (
  area: Area,
  rng: () => number = Math.random,
): { id: number; level: number } | null => {
  const enc = area.encounters;
  if (!enc) return null;
  const total = enc.table.reduce((a, e) => a + e.weight, 0);
  let roll = rng() * total;
  const hit = enc.table.find((e) => (roll -= e.weight) < 0) ?? enc.table[0];
  const level = enc.min + Math.floor(rng() * (enc.max - enc.min + 1));
  return { id: hit.id, level };
};

export const STARTERS = [
  { id: 1, name: "Bulbasaur", type: "grass" },
  { id: 4, name: "Charmander", type: "fire" },
  { id: 7, name: "Squirtle", type: "water" },
] as const;

export const STARTER_LEVEL = 5;

export const findTrainer = (id?: string): TrainerInfo | undefined => {
  if (!id) return undefined;
  for (const area of Object.values(AREAS))
    for (const npc of area.npcs) if (npc.trainer?.id === id) return npc.trainer;
  return undefined;
};
