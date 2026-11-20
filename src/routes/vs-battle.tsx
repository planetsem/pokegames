import { useMemo } from "react";
import { createFileRoute, useSearch } from "@tanstack/react-router";
import VersusBattleModule from "@/features/vs-battle/modules/VSBattle";

export interface IVsBattleSearch {
  mode: "1v1" | "3v3";
  /** Comma separated nickname slugs, pick order preserved. */
  team: string;
  seed: number;
  /** World battles: fixed PokeAPI ids and levels, comma separated. */
  enemies?: string;
  levels?: string;
  from?: "world";
  trainer?: string;
}

export const Route = createFileRoute("/vs-battle")({
  component: VersusBattle,
  validateSearch: (search: Record<string, unknown>): IVsBattleSearch => {
    // `pokemon` is the pre-v2 param; keep it as a 1v1 alias.
    const legacy = typeof search.pokemon === "string" ? search.pokemon : "";
    return {
      mode: search.mode === "3v3" ? "3v3" : "1v1",
      team: typeof search.team === "string" ? search.team : legacy,
      seed: Number(search.seed) || 1,
      enemies: typeof search.enemies === "string" || typeof search.enemies === "number" ? String(search.enemies) : undefined,
      levels: typeof search.levels === "string" || typeof search.levels === "number" ? String(search.levels) : undefined,
      from: search.from === "world" ? "world" : undefined,
      trainer: typeof search.trainer === "string" ? search.trainer : undefined,
    };
  },
});

function VersusBattle() {
  const { mode, team, seed, enemies, levels, from, trainer } = useSearch({
    from: "/vs-battle",
  });
  // Stable array identity: useBattleEngine keys its session on `team`.
  const nicknames = useMemo(() => team.split(",").filter(Boolean), [team]);
  return (
    <VersusBattleModule
      key={`${mode}:${team}:${seed}:${enemies ?? ""}`}
      mode={mode}
      team={nicknames}
      seed={seed}
      world={
        from === "world" && enemies
          ? {
              ids: enemies.split(",").map(Number).filter(Boolean),
              levels: (levels ?? "").split(",").map(Number),
              trainerId: trainer,
            }
          : undefined
      }
    />
  );
}
