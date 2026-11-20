import * as S from "./index.style";
import type { ReactNode } from "react";
import type { Side } from "@/features/vs-battle/engine/types";
import type { ExpGrant } from "@/utils/leveling";

interface Props {
  winner: Side;
  expGained: Array<ExpGrant>;
  levelUps: Array<{ nickname: string; level: number }>;
  onFindNew?: () => void;
  onLeave: () => void;
  leaveLabel?: string;
  /** Extra content above the buttons, e.g. the catch prompt in the world. */
  children?: ReactNode;
}

/** Sum grants per nickname so a 3v3 with three KOs shows one line per Pokemon. */
const totals = (grants: Array<ExpGrant>) =>
  Object.entries(
    grants.reduce<Record<string, number>>(
      (acc, g) => ({ ...acc, [g.nickname]: (acc[g.nickname] ?? 0) + g.amount }),
      {},
    ),
  );

const ResultPanel = ({
  winner,
  expGained,
  levelUps,
  onFindNew,
  onLeave,
  leaveLabel = "Back to Pokedex",
  children,
}: Props) => {
  const won = winner === "player";
  const rewards = totals(expGained);
  const finalLevels = new Map(levelUps.map((u) => [u.nickname, u.level]));

  return (
    <S.Panel
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}>
      <S.ResultHeader won={won}>
        <S.ResultIcon aria-hidden>{won ? "★" : "×"}</S.ResultIcon>
        <S.ResultCopy>
          <S.Eyebrow>{won ? "Battle cleared" : "Squad report"}</S.Eyebrow>
          <S.Title>{won ? "Victory!" : "Defeated"}</S.Title>
        </S.ResultCopy>
      </S.ResultHeader>

      <S.Rewards aria-label="Battle rewards">
        <S.RewardsHeader>
          <span>Battle rewards</span>
          <span>{rewards.length} Pokemon</span>
        </S.RewardsHeader>
        <S.RewardList>
          {rewards.length ? (
            rewards.map(([nickname, amount], index) => {
              const level = finalLevels.get(nickname);
              return (
                <S.RewardRow
                  key={nickname}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.12 + index * 0.07 }}>
                  <S.PokemonName>{nickname}</S.PokemonName>
                  <S.RewardMeta>
                    <S.Exp>+{amount} EXP</S.Exp>
                    {level && (
                      <S.LevelBadge
                        initial={{ scale: 0.7 }}
                        animate={{ scale: [0.7, 1.12, 1] }}
                        transition={{ delay: 0.3 + index * 0.07 }}>
                        Lv. {level} Up
                      </S.LevelBadge>
                    )}
                  </S.RewardMeta>
                </S.RewardRow>
              );
            })
          ) : (
            <S.EmptyReward>No EXP rewards this match</S.EmptyReward>
          )}
        </S.RewardList>
      </S.Rewards>

      {children}

      <S.Actions>
        {onFindNew && (
          <S.FindButton onClick={onFindNew}>Find New Opponent</S.FindButton>
        )}
        <S.LeaveButton onClick={onLeave}>{leaveLabel}</S.LeaveButton>
      </S.Actions>
    </S.Panel>
  );
};

export default ResultPanel;
