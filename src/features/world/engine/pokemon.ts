import type { QueryClient } from "@tanstack/react-query";
import type { IMyPokemon } from "@/services/api/pokemons";
import { getDetailPokemon } from "@/services/api/pokemons";
import {
  assignBattleSlots,
  loadBattleMovePool,
} from "@/features/vs-battle/data/movePool";
import { loadCachedMove } from "@/features/vs-battle/data/cachedMove";
import { getBaseStat, toSlug } from "@/utils/pokemon-utils";
import { statsAtLevel } from "@/utils/leveling";

/** BULBASAUR, BULBASAUR 2, BULBASAUR 3 ... never clashes with an existing slug. */
export function uniqueNickname(base: string, taken: Array<string>) {
  const slugs = new Set(taken.map(toSlug));
  const name = base.toUpperCase();
  if (!slugs.has(toSlug(name))) return name;
  for (let i = 2; ; i++) {
    const candidate = `${name} ${i}`;
    if (!slugs.has(toSlug(candidate))) return candidate;
  }
}

/** Builds a Pokemon the player owns, the same shape the Explore catch saves. */
export async function createOwnedPokemon(
  queryClient: QueryClient,
  id: number,
  level: number,
  taken: Array<string>,
): Promise<IMyPokemon> {
  const detail = await getDetailPokemon(id);
  if (!detail) throw new Error(`No data for Pokemon ${id}`);

  const base_stats = {
    hp: getBaseStat(detail, "hp"),
    attack: getBaseStat(detail, "attack"),
    defense: getBaseStat(detail, "defense"),
    special_attack: getBaseStat(detail, "special-attack"),
    special_defense: getBaseStat(detail, "special-defense"),
    speed: getBaseStat(detail, "speed"),
  };
  const types = detail.types.map((t) => t.type.name || "normal");
  const pool = await loadBattleMovePool(
    detail.moves,
    Math.max(1, types.length) + 2,
    Math.random,
    (name) => loadCachedMove(queryClient, name),
  );
  const { moves, skills } = assignBattleSlots(pool, Math.max(1, types.length));
  const animated =
    detail.sprites.versions?.["generation-v"]?.["black-white"]?.animated;

  return {
    name: detail.name.toUpperCase(),
    nickname: uniqueNickname(detail.name, taken),
    sprite: animated?.front_default || detail.sprites.front_default || "",
    sprite_back: animated?.back_default || detail.sprites.back_default || "",
    base_experience: detail.base_experience || 0,
    moveDataVersion: 3,
    stats: statsAtLevel(base_stats, level),
    base_stats,
    types,
    moves,
    skills,
    battle_state: { level, experience: 0 },
  };
}

/** Up to three strongest Pokemon walk with you. */
export function partyOf(pokemons: Array<IMyPokemon>) {
  return [...pokemons]
    .sort((a, b) => b.battle_state.level - a.battle_state.level)
    .slice(0, 3);
}
