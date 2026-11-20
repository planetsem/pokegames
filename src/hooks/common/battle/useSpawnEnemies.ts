import { useMemo } from "react";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import type {
  IBattleMove,
  IMyPokemon,
  IPokemonDetailResponse,
} from "@/services/api/pokemons";
import type { Rng } from "@/features/vs-battle/engine/types";
import { getDetailPokemon } from "@/services/api/pokemons";
import {
  assignBattleSlots,
  createSeededRng,
  loadBattleMovePool,
} from "@/features/vs-battle/data/movePool";
import { loadCachedMove } from "@/features/vs-battle/data/cachedMove";
import { getBaseStat, scaleStat } from "@/utils/pokemon-utils";
import { HP_BONUS } from "@/utils/leveling";

/** Highest PokeAPI id with full sprite coverage. */
const MAX_POKEMON_ID = 649;
const EARLY_GAME_LEVEL = 12;
const MAX_ALLOWED_BST = 320;

export const getDifficultyParams = (playerLevel: number) => {
  if (playerLevel < EARLY_GAME_LEVEL)
    return { statMultiplier: 1.0, minLevelAdd: -1, maxLevelAdd: 1 };
  if (playerLevel < 20)
    return { statMultiplier: 1.05, minLevelAdd: 0, maxLevelAdd: 2 };
  if (playerLevel < 40)
    return { statMultiplier: 1.08, minLevelAdd: 1, maxLevelAdd: 3 };
  return { statMultiplier: 1.15, minLevelAdd: 2, maxLevelAdd: 4 };
};

export function buildEnemy(
  detail: IPokemonDetailResponse,
  pool: Array<IBattleMove>,
  refLevel: number,
  rng: Rng = Math.random,
  fixedLevel?: number,
): IMyPokemon {
  const difficulty = getDifficultyParams(fixedLevel ?? refLevel);
  const min = Math.max(1, refLevel + difficulty.minLevelAdd);
  const max = refLevel + difficulty.maxLevelAdd;
  const level = fixedLevel
    ? Math.max(1, fixedLevel)
    : Math.floor(rng() * (max - min + 1)) + min;

  const keys = [
    "hp",
    "attack",
    "defense",
    "special-attack",
    "special-defense",
    "speed",
  ] as const;
  let raw = keys.map((k) => getBaseStat(detail, k));

  if (refLevel < EARLY_GAME_LEVEL) {
    const bst = raw.reduce((a, b) => a + b, 0);
    if (bst > MAX_ALLOWED_BST)
      raw = raw.map((v) => Math.floor((v * MAX_ALLOWED_BST) / bst));
  }

  const [hp, attack, defense, special_attack, special_defense, speed] = raw;
  const base_stats = {
    hp,
    attack,
    defense,
    special_attack,
    special_defense,
    speed,
  };
  const scale = (base: number, isHp = false) =>
    Math.floor(
      (scaleStat(base, level) + (isHp ? HP_BONUS(level) : 0)) *
        difficulty.statMultiplier,
    );

  const types = detail.types.map((t) => t.type.name || "normal");
  const { moves, skills } = assignBattleSlots(pool, Math.max(1, types.length));

  const animated =
    detail.sprites.versions?.["generation-v"]?.["black-white"]?.animated;

  return {
    name: detail.name,
    nickname: detail.name.toUpperCase(),
    sprite: animated?.front_default || detail.sprites.front_default || "",
    sprite_back: animated?.back_default || detail.sprites.back_default || "",
    base_experience: detail.base_experience || 0,
    moveDataVersion: 3,
    battle_state: { level, experience: 0 },
    base_stats,
    stats: {
      hp: scale(hp, true),
      attack: scale(attack),
      defense: scale(defense),
      special_attack: scale(special_attack),
      special_defense: scale(special_defense),
      speed: scale(speed),
    },
    types,
    moves,
    skills,
  };
}

interface Props {
  count: number;
  refLevel: number;
  /** Stable per battle so a re-render never re-rolls the ids. */
  seed: number;
  /** Fixed species (world encounters, trainers). Overrides count. */
  fixedIds?: Array<number>;
  fixedLevels?: Array<number>;
  /** Multiplies enemy stats; the world uses < 1 so early routes are fair. */
  statScale?: number;
}

export function useSpawnEnemies({
  count,
  refLevel,
  seed,
  fixedIds,
  fixedLevels,
  statScale = 1,
}: Props) {
  const queryClient = useQueryClient();
  const fixedKey = fixedIds?.join(",") ?? "";
  const ids = useMemo(() => {
    if (fixedIds?.length) return fixedIds;
    let x = seed || 1;
    const next = () => (x = (x * 1103515245 + 12345) % 2147483648) / 2147483648;
    return Array.from(
      { length: count },
      () => 1 + Math.floor(next() * MAX_POKEMON_ID),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, seed, fixedKey]);

  const results = useQueries({
    queries: ids.map((id, index) => ({
      queryKey: ["battle-enemy", id, seed],
      queryFn: async () => {
        const detail = await getDetailPokemon(id);
        if (!detail) throw new Error(`Pokemon ${id} returned no detail`);
        const pool = await loadBattleMovePool(
          detail.moves,
          Math.max(1, detail.types.length) + 2,
          createSeededRng(seed + id + index),
          (name) => loadCachedMove(queryClient, name),
        );
        return { detail, pool };
      },
      staleTime: 1000 * 60 * 60 * 24,
      retry: 1,
    })),
  });

  const isLoading = results.some((r) => r.isPending);
  const isError = results.some((r) => r.isError);
  const enemies = useMemo(() => {
    if (isLoading || isError) return null;
    return results.map((r, index) => {
      const enemy = buildEnemy(
        r.data!.detail,
        r.data!.pool,
        refLevel,
        createSeededRng(seed + ids[index] + index + count),
        fixedLevels?.[index] || undefined,
      );
      if (statScale === 1) return enemy;
      const stats = { ...enemy.stats };
      (Object.keys(stats) as Array<keyof typeof stats>).forEach((k) => {
        stats[k] = Math.max(1, Math.round(stats[k] * statScale));
      });
      return { ...enemy, stats };
    });
  }, [
    isLoading,
    isError,
    refLevel,
    seed,
    ids,
    count,
    fixedLevels?.join(","),
    statScale,
    ...results.map((r) => r.data),
  ]);

  return { enemies, isLoading, isError };
}
