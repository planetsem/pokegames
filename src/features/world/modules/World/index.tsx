import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import * as S from "./index.style";
import type { DialogApi, DialogData } from "../../components/DialogBox";
import type { Area, Npc, TrainerInfo, Warp } from "../../data/maps";
import type { Facing } from "@/store/app/worldStore";
import DialogBox from "../../components/DialogBox";
import TouchControls from "../../components/TouchControls";
import {
  AREAS,
  ENCOUNTER_TILES,
  PLAYER_PALETTE,
  SOLID,
  STARTERS,
  STARTER_LEVEL,
  pickEncounter,
  tileAt,
} from "../../data/maps";
import {
  TILE,
  drawCharacter,
  drawExclamation,
  renderAreaCache,
  tallGrassOverlay,
} from "../../engine/art";
import { createOwnedPokemon, partyOf } from "../../engine/pokemon";
import { START_POSITION, useWorldStore } from "@/store/app/worldStore";
import { usePokemonStore } from "@/store/app/pokemonStore";
import { useAuthStore } from "@/store/app/authStore";
import { toSlug } from "@/utils/pokemon-utils";

const MOVE_MS = 190;
const TURN_MS = 85;
const ENCOUNTER_RATE = 1 / 9;

const DIRS: Record<Facing, [number, number]> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};
const OPPOSITE: Record<Facing, Facing> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

const KEY_DIR: Record<string, Facing> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  s: "down",
  a: "left",
  d: "right",
  W: "up",
  S: "down",
  A: "left",
  D: "right",
};

interface Mover {
  x: number;
  y: number;
  facing: Facing;
  fromX: number;
  fromY: number;
  t0: number;
  moving: boolean;
  step: number;
  duration: number;
}

interface NpcState extends Mover {
  def: Npc;
  exclaim: boolean;
  nextLook: number;
}

const mover = (x: number, y: number, facing: Facing): Mover => ({
  x,
  y,
  facing,
  fromX: x,
  fromY: y,
  t0: 0,
  moving: false,
  step: 0,
  duration: MOVE_MS,
});

/** Pixel position of a mover at time `now`, eased between tiles. */
const pixelOf = (m: Mover, now: number) => {
  if (!m.moving) return { px: m.x * TILE, py: m.y * TILE, p: 1 };
  const p = Math.min(1, (now - m.t0) / m.duration);
  return {
    px: (m.fromX + (m.x - m.fromX) * p) * TILE,
    py: (m.fromY + (m.y - m.fromY) * p) * TILE,
    p,
  };
};

const sleep = (ms: number) => new Promise((r) => window.setTimeout(r, ms));

const WorldModule = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dialogApi = useRef<DialogApi>(null);

  const world = useWorldStore();
  const pokemons = usePokemonStore((s) => s.pokemons);
  const user = useAuthStore((s) => s.user);

  const [dialog, setDialog] = useState<DialogData | null>(null);
  const [fade, setFade] = useState<{ show: boolean; flash: boolean }>({
    show: true,
    flash: false,
  });
  const [banner, setBanner] = useState<{ text: string; show: boolean }>({
    text: "",
    show: false,
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuIndex, setMenuIndex] = useState(0);
  const [askName, setAskName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const askNameRef = useRef(false);
  askNameRef.current = askName;

  // --- mutable game state (read by the render loop, never re-renders) ---
  const start =
    AREAS[world.position.area] && world.position ? world.position : START_POSITION;
  const areaRef = useRef<Area>(AREAS[start.area]);
  const player = useRef<Mover>(mover(start.x, start.y, start.facing));
  const npcs = useRef<Array<NpcState>>([]);
  const held = useRef<Array<Facing>>([]);
  const turnUntil = useRef(0);
  const locked = useRef(true);
  const caches = useRef<Array<HTMLCanvasElement>>([]);
  const dialogResolve = useRef<((choice: number) => void) | null>(null);
  const menuOpenRef = useRef(false);
  menuOpenRef.current = menuOpen;
  const bannerTimer = useRef(0);

  const hasPokemon = () => usePokemonStore.getState().pokemons.length > 0;
  const defeated = (id: string) =>
    useWorldStore.getState().defeatedTrainers.includes(id);

  // --- dialog helpers ------------------------------------------------------
  const ask = useCallback(
    (data: DialogData) =>
      new Promise<number>((resolve) => {
        dialogResolve.current = resolve;
        setDialog(data);
      }),
    [],
  );

  const say = useCallback(
    async (lines: Array<string>, speaker?: string) => {
      for (const text of lines) await ask({ text, speaker });
      setDialog(null);
    },
    [ask],
  );

  const choose = useCallback(
    async (text: string, choices: Array<string>, speaker?: string) => {
      const i = await ask({ text, choices, speaker });
      setDialog(null);
      return i;
    },
    [ask],
  );

  const onDialogDone = (choice: number) => {
    const r = dialogResolve.current;
    dialogResolve.current = null;
    r?.(choice);
  };

  // --- area loading --------------------------------------------------------
  const showBanner = (text: string) => {
    window.clearTimeout(bannerTimer.current);
    setBanner({ text, show: true });
    bannerTimer.current = window.setTimeout(
      () => setBanner((b) => ({ ...b, show: false })),
      2200,
    );
  };

  const loadArea = useCallback((area: Area) => {
    areaRef.current = area;
    caches.current = [renderAreaCache(area, 0), renderAreaCache(area, 1)];
    npcs.current = area.npcs.map((def) => ({
      ...mover(def.x, def.y, def.facing),
      def,
      exclaim: false,
      nextLook: performance.now() + 1500 + Math.random() * 2500,
    }));
  }, []);

  const savePosition = () => {
    const p = player.current;
    useWorldStore.getState().setPosition({
      area: areaRef.current.id,
      x: p.x,
      y: p.y,
      facing: p.facing,
    });
  };

  // --- movement helpers ----------------------------------------------------
  const occupied = (x: number, y: number) =>
    npcs.current.some((n) => n.x === x && n.y === y);

  const walkable = (area: Area, x: number, y: number) =>
    x >= 0 &&
    y >= 0 &&
    y < area.tiles.length &&
    x < area.tiles[0].length &&
    !SOLID.has(tileAt(area, x, y));

  const startMove = (m: Mover, x: number, y: number, now: number, duration = MOVE_MS) => {
    m.fromX = m.x;
    m.fromY = m.y;
    m.x = x;
    m.y = y;
    m.t0 = now;
    m.moving = true;
    m.duration = duration;
    m.step = (m.step + 1) % 4;
  };

  /** Resolves after an NPC walks one tile; used for trainers coming to you. */
  const walkNpc = (n: NpcState, dir: Facing) =>
    new Promise<void>((resolve) => {
      const [dx, dy] = DIRS[dir];
      n.facing = dir;
      startMove(n, n.x + dx, n.y + dy, performance.now(), MOVE_MS * 1.15);
      window.setTimeout(resolve, MOVE_MS * 1.15 + 10);
    });

  // --- scripted events -----------------------------------------------------
  const fadeOut = async (flash = false) => {
    setFade({ show: true, flash });
    await sleep(flash ? 130 : 250);
  };
  const fadeIn = async () => {
    setFade({ show: false, flash: false });
    await sleep(250);
  };

  const warpTo = useCallback(
    async (w: Pick<Warp, "to" | "tx" | "ty" | "facing">) => {
      locked.current = true;
      await fadeOut();
      const area = AREAS[w.to];
      loadArea(area);
      const p = player.current;
      Object.assign(p, mover(w.tx, w.ty, w.facing));
      p.step = 0;
      savePosition();
      await fadeIn();
      showBanner(area.name);
      locked.current = false;
    },
    [loadArea],
  );

  const startBattle = async (opts: {
    ids: Array<number>;
    levels: Array<number>;
    trainer?: TrainerInfo;
  }) => {
    locked.current = true;
    savePosition();
    const party = partyOf(usePokemonStore.getState().pokemons);
    const team = party.map((p) => toSlug(p.nickname)).join(",");
    for (let i = 0; i < 3; i++) {
      await fadeOut(true);
      setFade({ show: false, flash: true });
      await sleep(110);
    }
    await fadeOut();
    navigate({
      to: "/vs-battle",
      search: {
        mode: party.length > 1 || opts.ids.length > 1 ? "3v3" : "1v1",
        team,
        seed: Date.now() % 1_000_000_007,
        enemies: opts.ids.join(","),
        levels: opts.levels.join(","),
        from: "world",
        trainer: opts.trainer?.id,
      },
    });
  };

  const engageTrainer = async (n: NpcState, distance: number) => {
    const t = n.def.trainer!;
    locked.current = true;
    held.current = [];
    n.exclaim = true;
    await sleep(750);
    n.exclaim = false;
    for (let i = 0; i < distance - 1; i++) await walkNpc(n, n.facing);
    player.current.facing = OPPOSITE[n.facing];
    await say(t.before, t.title);
    if (!hasPokemon()) {
      await say(["...You don't have any Pokemon? Come back when you do!"], t.title);
      locked.current = false;
      return;
    }
    await startBattle({ ids: t.team, levels: t.levels, trainer: t });
  };

  /** Is the player standing in an undefeated trainer's line of sight? */
  const spottedBy = (): { npc: NpcState; distance: number } | null => {
    const area = areaRef.current;
    const p = player.current;
    for (const n of npcs.current) {
      const t = n.def.trainer;
      if (!t || defeated(t.id)) continue;
      const [dx, dy] = DIRS[n.facing];
      for (let d = 1; d <= t.sight; d++) {
        const x = n.x + dx * d;
        const y = n.y + dy * d;
        if (x === p.x && y === p.y) return { npc: n, distance: d };
        if (!walkable(area, x, y) || occupied(x, y)) break;
      }
    }
    return null;
  };

  const giveStarter = async (speaker: string) => {
    await say(
      [
        "Hello there! I'm Professor Hazel.",
        "Every trainer needs a partner before they go out into the tall grass.",
      ],
      speaker,
    );
    for (;;) {
      const pick = await choose(
        "Which Pokemon will you choose?",
        STARTERS.map((s) => `${s.name} (${s.type})`),
        speaker,
      );
      const starter = STARTERS[pick];
      const ok = await choose(
        `So you want ${starter.name}?`,
        ["Yes", "No"],
        speaker,
      );
      if (ok !== 0) continue;
      setDialog({ text: "...", speaker });
      try {
        const mon = await createOwnedPokemon(
          queryClient,
          starter.id,
          STARTER_LEVEL,
          usePokemonStore.getState().pokemons.map((p) => p.nickname),
        );
        usePokemonStore.getState().addPokemon(mon);
        await say(
          [
            `You received ${mon.nickname}!`,
            "Route 1 is north of town. Walk in the tall grass to find wild Pokemon. Good luck!",
          ],
          speaker,
        );
      } catch {
        await say(
          ["Hmm, the PokeAPI isn't answering. Check your connection and try again."],
          speaker,
        );
      }
      return;
    }
  };

  const talkTo = async (n: NpcState) => {
    locked.current = true;
    n.facing = OPPOSITE[player.current.facing];
    const def = n.def;
    if (def.trainer) {
      if (defeated(def.trainer.id)) await say(def.trainer.after, def.trainer.title);
      else return engageTrainer(n, 1);
    } else if (def.role === "professor" && !hasPokemon()) {
      await giveStarter(def.name);
    } else if (def.role === "nurse") {
      await say([def.dialog[0], "Let me take care of your Pokemon..."], def.name);
      await fadeOut();
      await sleep(350);
      await fadeIn();
      const back = areaRef.current.warps[0];
      useWorldStore
        .getState()
        .setRespawn({ area: back.to, x: back.tx, y: back.ty });
      await say([def.dialog[1]], def.name);
    } else {
      await say(def.dialog, def.name);
    }
    locked.current = false;
  };

  const interact = () => {
    const area = areaRef.current;
    const p = player.current;
    const [dx, dy] = DIRS[p.facing];
    let tx = p.x + dx;
    let ty = p.y + dy;
    if (tileAt(area, tx, ty) === "K") {
      tx += dx;
      ty += dy;
    }
    const npc = npcs.current.find((n) => n.x === tx && n.y === ty);
    if (npc) return void talkTo(npc);
    const sign = area.signs.find((s) => s.x === p.x + dx && s.y === p.y + dy);
    if (sign) {
      locked.current = true;
      void say(sign.text).then(() => (locked.current = false));
    }
  };

  const onStepDone = async () => {
    const area = areaRef.current;
    const p = player.current;
    useWorldStore.getState().addStep();
    const warp = area.warps.find((w) => w.x === p.x && w.y === p.y);
    if (warp) return warpTo(warp);
    savePosition();

    const spotted = spottedBy();
    if (spotted) return engageTrainer(spotted.npc, spotted.distance);

    if (
      ENCOUNTER_TILES.has(tileAt(area, p.x, p.y)) &&
      hasPokemon() &&
      Math.random() < ENCOUNTER_RATE
    ) {
      const enc = pickEncounter(area);
      if (enc) {
        held.current = [];
        await startBattle({ ids: [enc.id], levels: [enc.level] });
      }
    }
  };

  const tryMove = (dir: Facing, now: number) => {
    const area = areaRef.current;
    const p = player.current;
    const [dx, dy] = DIRS[dir];
    const nx = p.x + dx;
    const ny = p.y + dy;
    if (
      area.needsPokemonBelowY !== undefined &&
      ny <= area.needsPokemonBelowY &&
      !hasPokemon()
    ) {
      locked.current = true;
      held.current = [];
      void say([
        "Wait! It's dangerous to go into the tall grass without a Pokemon.",
        "Visit Professor Hazel's lab first. It's the house in the top left.",
      ]).then(() => (locked.current = false));
      return;
    }
    const isWarp = area.warps.some((w) => w.x === nx && w.y === ny);
    if ((walkable(area, nx, ny) || isWarp) && !occupied(nx, ny))
      startMove(p, nx, ny, now);
  };

  // --- per-frame update ------------------------------------------------------
  const update = (now: number) => {
    const p = player.current;
    if (p.moving && now - p.t0 >= p.duration) {
      p.moving = false;
      if (!locked.current) void onStepDone();
    }
    for (const n of npcs.current) {
      if (n.moving && now - n.t0 >= n.duration) n.moving = false;
      if (
        n.def.looksAround &&
        !n.def.trainer &&
        !locked.current &&
        now > n.nextLook
      ) {
        const dirs: Array<Facing> = ["up", "down", "left", "right"];
        n.facing = dirs[Math.floor(Math.random() * 4)];
        n.nextLook = now + 1800 + Math.random() * 3200;
      }
    }

    if (locked.current || menuOpenRef.current || p.moving) return;
    const dir = held.current[held.current.length - 1];
    if (!dir) return;
    if (p.facing !== dir) {
      p.facing = dir;
      turnUntil.current = now + TURN_MS;
      return;
    }
    if (now >= turnUntil.current) tryMove(dir, now);
  };

  // --- rendering -------------------------------------------------------------
  const render = (ctx: CanvasRenderingContext2D, now: number) => {
    const canvas = ctx.canvas;
    const area = areaRef.current;
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.width / dpr;
    const cssH = canvas.height / dpr;
    const scale =
      Math.max(2, Math.min(5, Math.floor(Math.min(cssW / (TILE * 15), cssH / (TILE * 11))))) *
      dpr;
    const viewW = canvas.width / scale;
    const viewH = canvas.height / scale;
    const mapW = area.tiles[0].length * TILE;
    const mapH = area.tiles.length * TILE;

    const pp = pixelOf(player.current, now);
    const camX =
      mapW <= viewW
        ? (mapW - viewW) / 2
        : Math.max(0, Math.min(mapW - viewW, pp.px + TILE / 2 - viewW / 2));
    const camY =
      mapH <= viewH
        ? (mapH - viewH) / 2
        : Math.max(0, Math.min(mapH - viewH, pp.py + TILE / 2 - viewH / 2));
    const cx = Math.round(camX * scale) / scale;
    const cy = Math.round(camY * scale) / scale;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = area.dark ? "#050505" : "#111";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, -cx * scale, -cy * scale);

    const frame = Math.floor(now / 600) % 2;
    const cache = caches.current[frame];
    if (cache) ctx.drawImage(cache, 0, 0);

    type Drawable = { px: number; py: number; draw: () => void };
    const list: Array<Drawable> = [];

    const stepFrame = (m: Mover, p: number) =>
      m.moving ? (p < 0.5 ? m.step : m.step === 3 ? 0 : m.step) : 0;

    const onTall = (m: Mover, p: number) => {
      const tx = p >= 0.5 || !m.moving ? m.x : m.fromX;
      const ty = p >= 0.5 || !m.moving ? m.y : m.fromY;
      return tileAt(area, tx, ty) === ",";
    };

    for (const n of npcs.current) {
      const { px, py, p } = pixelOf(n, now);
      list.push({
        px,
        py,
        draw: () => {
          drawCharacter(ctx, n.def.palette, n.facing, stepFrame(n, p), px, py);
          if (onTall(n, p)) tallGrassOverlay(ctx, px, py, n.y);
          if (n.exclaim) drawExclamation(ctx, px, py);
        },
      });
    }
    list.push({
      px: pp.px,
      py: pp.py,
      draw: () => {
        const m = player.current;
        drawCharacter(ctx, PLAYER_PALETTE, m.facing, stepFrame(m, pp.p), pp.px, pp.py);
        if (onTall(m, pp.p)) tallGrassOverlay(ctx, pp.px, pp.py, m.y);
      },
    });
    list.sort((a, b) => a.py - b.py).forEach((d) => d.draw());

    if (area.dark) {
      const gx = pp.px + TILE / 2;
      const gy = pp.py + TILE / 2;
      const g = ctx.createRadialGradient(gx, gy, 18, gx, gy, 78);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(1, "rgba(0,0,0,0.88)");
      ctx.fillStyle = g;
      ctx.fillRect(cx, cy, viewW, viewH);
    }
  };

  // --- boot: load area, handle the result of the last battle -----------------
  useEffect(() => {
    loadArea(areaRef.current);
    let raf = 0;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(canvas.clientWidth * dpr);
      canvas.height = Math.floor(canvas.clientHeight * dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    const loop = (now: number) => {
      update(now);
      render(ctx, now);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    void (async () => {
      const ws = useWorldStore.getState();
      const outcome = ws.lastOutcome;
      ws.setOutcome(null);
      await sleep(80);
      await fadeIn();
      showBanner(areaRef.current.name);

      if (outcome?.kind === "trainer" && outcome.won && outcome.trainerId) {
        ws.defeatTrainer(outcome.trainerId);
        const n = npcs.current.find((x) => x.def.trainer?.id === outcome.trainerId);
        if (n?.def.trainer) await say(n.def.trainer.after, n.def.trainer.title);
      } else if (outcome && !outcome.won && !outcome.fled) {
        await say(["Your team is out of energy...", "You hurried back to safety."]);
        const r = useWorldStore.getState().respawn;
        await warpTo({ to: r.area, tx: r.x, ty: r.y, facing: "down" });
      } else if (outcome?.caught) {
        await say([`${outcome.caught} is now part of your team!`]);
      }

      if (!useWorldStore.getState().trainerName) {
        setAskName(true);
        return;
      }
      const spotted = spottedBy();
      if (spotted) return engageTrainer(spotted.npc, spotted.distance);
      locked.current = false;
    })();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.clearTimeout(bannerTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A cloud save was loaded while we're on screen: jump to its position.
  const firstLoad = useRef(world.loadId);
  useEffect(() => {
    if (world.loadId === firstLoad.current) return;
    firstLoad.current = world.loadId;
    const pos = useWorldStore.getState().position;
    const area = AREAS[pos.area] ?? AREAS[START_POSITION.area];
    loadArea(area);
    Object.assign(player.current, mover(pos.x, pos.y, pos.facing));
    showBanner(area.name);
    if (askNameRef.current && useWorldStore.getState().trainerName) {
      setAskName(false);
      locked.current = false;
    }
  }, [world.loadId, loadArea]);

  // --- input -----------------------------------------------------------------
  const MENU = [
    { label: "Team", go: () => navigate({ to: "/my-pokemon" }) },
    { label: "Pokedex", go: () => navigate({ to: "/pokemons" }) },
    { label: user ? "Account" : "Log in / Sign up", go: () => navigate({ to: "/account" }) },
    {
      label: "Save",
      go: async () => {
        savePosition();
        setMenuOpen(false);
        locked.current = true;
        await useAuthStore.getState().syncNow();
        await say([
          useAuthStore.getState().user
            ? "Your game was saved to the cloud!"
            : "Saved on this device. Log in to keep it on every device.",
        ]);
        locked.current = false;
      },
    },
    { label: "Close", go: () => setMenuOpen(false) },
  ];

  const pressA = () => {
    if (dialog) return dialogApi.current?.press();
    if (askName) return;
    if (menuOpen) return void MENU[menuIndex].go();
    if (!locked.current && !player.current.moving) interact();
  };

  const pressB = () => {
    if (dialog) return dialogApi.current?.press();
    if (menuOpen) return setMenuOpen(false);
  };

  const toggleMenu = () => {
    if (dialog || askName || locked.current) return;
    setMenuIndex(0);
    setMenuOpen((o) => !o);
    held.current = [];
  };

  const setDir = (dir: Facing, down: boolean) => {
    if (down) {
      if (dialog?.choices) return dialogApi.current?.move(dir === "up" ? -1 : dir === "down" ? 1 : 0);
      if (menuOpenRef.current) {
        if (dir === "up" || dir === "down")
          setMenuIndex((i) => (i + (dir === "up" ? -1 : 1) + MENU.length) % MENU.length);
        return;
      }
      held.current = [...held.current.filter((d) => d !== dir), dir];
    } else {
      held.current = held.current.filter((d) => d !== dir);
    }
  };

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (askName) return;
      const dir = KEY_DIR[e.key];
      if (dir) {
        e.preventDefault();
        if (!e.repeat) setDir(dir, true);
        return;
      }
      if (e.repeat) return;
      if (["z", "Z", "Enter", " ", "e", "E"].includes(e.key)) {
        e.preventDefault();
        pressA();
      } else if (["x", "X", "Escape", "Backspace", "q", "Q"].includes(e.key)) {
        pressB();
      } else if (["m", "M", "Tab"].includes(e.key)) {
        e.preventDefault();
        toggleMenu();
      }
    };
    const up = (e: KeyboardEvent) => {
      const dir = KEY_DIR[e.key];
      if (dir) setDir(dir, false);
    };
    const blur = () => (held.current = []);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  });

  const party = partyOf(pokemons);

  return (
    <S.Screen>
      <S.Canvas ref={canvasRef} aria-label="Game world" />
      <S.Banner show={banner.show}>{banner.text}</S.Banner>

      <S.TopRight>
        <S.HudButton onClick={toggleMenu} aria-expanded={menuOpen}>
          Menu
        </S.HudButton>
      </S.TopRight>

      {menuOpen && (
        <S.Menu role="menu">
          <S.MenuHeader>
            {world.trainerName || "Trainer"}
            <small>
              {user ? `Logged in · ${user.email}` : "Not logged in · saved on this device"}
            </small>
            <small>
              Trainers beaten: {world.defeatedTrainers.length} · Pokemon: {pokemons.length}
            </small>
            <S.Party>
              {party.map((p) => (
                <img key={p.nickname} src={p.sprite} alt={p.nickname} title={`${p.nickname} Lv.${p.battle_state.level}`} />
              ))}
            </S.Party>
          </S.MenuHeader>
          {MENU.map((m, i) => (
            <S.MenuItem
              key={m.label}
              active={i === menuIndex}
              onPointerEnter={() => setMenuIndex(i)}
              onClick={() => void m.go()}>
              {m.label}
            </S.MenuItem>
          ))}
        </S.Menu>
      )}

      {dialog && <DialogBox ref={dialogApi} data={dialog} onDone={onDialogDone} />}

      {askName && (
        <S.NameCard
          onSubmit={(e) => {
            e.preventDefault();
            const name = nameDraft.trim().slice(0, 12);
            if (!name) return;
            useWorldStore.getState().setTrainerName(name.toUpperCase());
            setAskName(false);
            void say([
              `Nice to meet you, ${name.toUpperCase()}!`,
              hasPokemon()
                ? "Your Pokemon are ready. Explore and battle!"
                : "Visit Professor Hazel's lab (top left) to get your first Pokemon.",
              "Move with the arrow keys or WASD, talk with Z or Enter, open the menu with M.",
            ]).then(() => (locked.current = false));
          }}>
          <span>What's your name, trainer?</span>
          <input
            autoFocus
            maxLength={12}
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            placeholder="SAM"
            aria-label="Trainer name"
          />
          <button type="submit">Start adventure</button>
          <small>
            Already have an account? <a href="/account">Log in</a> to load your save.
          </small>
        </S.NameCard>
      )}

      <TouchControls onDir={setDir} onA={pressA} onB={pressB} />
      <S.Fade show={fade.show} flash={fade.flash} />
    </S.Screen>
  );
};

export default WorldModule;
