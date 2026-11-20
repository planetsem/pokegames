import { useState } from "react";
import styled from "@emotion/styled";
import type { IMyPokemon } from "@/services/api/pokemons";
import { FindButton } from "@/features/vs-battle/components/ResultPanel/index.style";
import { useCatchPokemon } from "@/hooks/common/useCatchPokemon";
import { usePokemonStore } from "@/store/app/pokemonStore";
import { statsAtLevel } from "@/utils/leveling";
import { colors } from "@/utils";
import { uniqueNickname } from "../engine/pokemon";

interface Props {
  wild: IMyPokemon;
  chance: number;
  onCaught: (nickname: string) => void;
}

const Box = styled("div")({
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  padding: "10px",
  color: colors["white-800"],
  backgroundColor: colors["gray-800"],
  fontSize: "1.15rem",
  textAlign: "center",
});

const Ball = styled("span")<{ shake: number }>(({ shake }) => ({
  display: "inline-block",
  fontSize: "1.8rem",
  transform: `rotate(${shake % 2 ? -18 : shake ? 18 : 0}deg)`,
  transition: "transform 0.25s",
}));

/** "Throw a Poke Ball" after beating a wild Pokemon in the world. */
const WorldCatch = ({ wild, chance, onCaught }: Props) => {
  const { pokemons, addPokemon } = usePokemonStore();
  const [result, setResult] = useState<"idle" | "caught" | "fled">("idle");
  const [tries, setTries] = useState(0);
  const [savedName, setSavedName] = useState("");

  const { isCatching, isEndPhase, isCaught, shake, throwPokeball } =
    useCatchPokemon(() => {
      const nickname = uniqueNickname(
        wild.name,
        pokemons.map((p) => p.nickname),
      );
      const level = wild.battle_state.level;
      const caught: IMyPokemon = {
        ...wild,
        name: wild.name.toUpperCase(),
        nickname,
        battle_state: { level, experience: 0 },
        stats: wild.base_stats ? statsAtLevel(wild.base_stats, level) : wild.stats,
      };
      if (addPokemon(caught)) {
        setSavedName(nickname);
        setResult("caught");
        onCaught(nickname);
      }
    }, chance);

  const done = result !== "idle";
  const missed = isEndPhase && !isCaught;

  const throwBall = async () => {
    setTries((t) => t + 1);
    await throwPokeball();
  };

  if (result === "caught")
    return <Box>Gotcha! {savedName} joined your team!</Box>;

  if (tries >= 3 && !isCatching && !isEndPhase)
    return <Box>{wild.name.toUpperCase()} got away...</Box>;

  return (
    <Box>
      {isCatching ? (
        <>
          <Ball shake={shake}>◓</Ball>
          <span>{".".repeat(shake)}</span>
        </>
      ) : missed ? (
        <span>Oh no! It broke free!</span>
      ) : (
        <span>
          Catch rate {Math.round(chance * 100)}% · {3 - tries} ball
          {3 - tries === 1 ? "" : "s"} left
        </span>
      )}
      {!done && !isCatching && !isEndPhase && (
        <FindButton onClick={throwBall}>Throw Poke Ball</FindButton>
      )}
    </Box>
  );
};

export default WorldCatch;
