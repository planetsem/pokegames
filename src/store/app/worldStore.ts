import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Facing = "up" | "down" | "left" | "right";

export interface WorldPosition {
  area: string;
  x: number;
  y: number;
  facing: Facing;
}

/** Where a lost battle sends you back to. */
export interface RespawnPoint {
  area: string;
  x: number;
  y: number;
}

/** Set by the battle screen, read once by the world when it mounts. */
export interface BattleOutcome {
  kind: "wild" | "trainer";
  trainerId?: string;
  won: boolean;
  caught?: string;
  fled?: boolean;
}

interface IWorldStore {
  position: WorldPosition;
  respawn: RespawnPoint;
  defeatedTrainers: Array<string>;
  trainerName: string;
  steps: number;
  lastOutcome: BattleOutcome | null;
  updatedAt: number;
  /** Bumped whenever a cloud save replaces the state; the world reloads. */
  loadId: number;

  setPosition: (p: WorldPosition) => void;
  setRespawn: (r: RespawnPoint) => void;
  defeatTrainer: (id: string) => void;
  setTrainerName: (name: string) => void;
  addStep: () => void;
  setOutcome: (o: BattleOutcome | null) => void;
  /** Replace everything, used when a cloud save is loaded. */
  hydrate: (data: Partial<WorldSnapshot>) => void;
}

export type WorldSnapshot = Pick<
  IWorldStore,
  | "position"
  | "respawn"
  | "defeatedTrainers"
  | "trainerName"
  | "steps"
  | "updatedAt"
>;

export const WORLD_STORE_KEY = "pokegames@world-store";

export const START_POSITION: WorldPosition = {
  area: "hilltown",
  x: 11,
  y: 10,
  facing: "down",
};

const START_RESPAWN: RespawnPoint = { area: "hilltown", x: 18, y: 6 };

const touch = () => ({ updatedAt: Date.now() });

export const useWorldStore = create<IWorldStore>()(
  persist(
    (set) => ({
      position: START_POSITION,
      respawn: START_RESPAWN,
      defeatedTrainers: [],
      trainerName: "",
      steps: 0,
      lastOutcome: null,
      updatedAt: 0,
      loadId: 0,

      setPosition: (position) => set({ position, ...touch() }),
      setRespawn: (respawn) => set({ respawn, ...touch() }),
      defeatTrainer: (id) =>
        set((s) =>
          s.defeatedTrainers.includes(id)
            ? s
            : { defeatedTrainers: [...s.defeatedTrainers, id], ...touch() },
        ),
      setTrainerName: (trainerName) => set({ trainerName, ...touch() }),
      addStep: () => set((s) => ({ steps: s.steps + 1 })),
      setOutcome: (lastOutcome) => set({ lastOutcome }),
      hydrate: (data) =>
        set((s) => ({
          position: data.position ?? s.position,
          respawn: data.respawn ?? s.respawn,
          defeatedTrainers: data.defeatedTrainers ?? s.defeatedTrainers,
          trainerName: data.trainerName ?? s.trainerName,
          steps: data.steps ?? s.steps,
          updatedAt: data.updatedAt ?? s.updatedAt,
          loadId: s.loadId + 1,
        })),
    }),
    {
      name: WORLD_STORE_KEY,
      version: 1,
      partialize: (s) => ({
        position: s.position,
        respawn: s.respawn,
        defeatedTrainers: s.defeatedTrainers,
        trainerName: s.trainerName,
        steps: s.steps,
        lastOutcome: s.lastOutcome,
        updatedAt: s.updatedAt,
      }),
    },
  ),
);

export const worldSnapshot = (): WorldSnapshot => {
  const s = useWorldStore.getState();
  return {
    position: s.position,
    respawn: s.respawn,
    defeatedTrainers: s.defeatedTrainers,
    trainerName: s.trainerName,
    steps: s.steps,
    updatedAt: s.updatedAt,
  };
};
