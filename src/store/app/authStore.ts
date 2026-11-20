import { create } from "zustand";
import type { IMyPokemon } from "@/services/api/pokemons";
import type { WorldSnapshot } from "./worldStore";
import { SAVES_TABLE, supabase } from "@/libs/supabase";
import { usePokemonStore } from "./pokemonStore";
import { useWorldStore, worldSnapshot } from "./worldStore";

export interface AuthUser {
  id: string;
  email: string;
}

interface SaveData {
  version: 1;
  pokemons: Array<IMyPokemon>;
  world: WorldSnapshot;
}

type Status = "idle" | "loading" | "syncing" | "saved" | "error";

interface IAuthStore {
  configured: boolean;
  ready: boolean;
  user: AuthUser | null;
  status: Status;
  lastSavedAt: number | null;
  error: string | null;
  init: () => void;
  signUp: (
    email: string,
    password: string,
    trainerName: string,
  ) => Promise<{ needsConfirm: boolean }>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  syncNow: () => Promise<void>;
}

const localSave = (): SaveData => ({
  version: 1,
  pokemons: usePokemonStore.getState().pokemons,
  world: worldSnapshot(),
});

const hasLocalProgress = () =>
  usePokemonStore.getState().pokemons.length > 0 ||
  useWorldStore.getState().steps > 0;

let started = false;
let pushTimer = 0;
/** True while a cloud save is being written into the stores. */
let applying = false;
/** User id whose cloud save has been loaded this page session. */
let pulledFor: string | null = null;

export const useAuthStore = create<IAuthStore>()((set, get) => {
  async function push() {
    const user = get().user;
    if (!supabase || !user) return;
    set({ status: "syncing", error: null });
    const data = localSave();
    const { error } = await supabase.from(SAVES_TABLE).upsert({
      user_id: user.id,
      trainer_name: data.world.trainerName || null,
      data,
      updated_at: new Date().toISOString(),
    });
    if (error) set({ status: "error", error: error.message });
    else set({ status: "saved", lastSavedAt: Date.now() });
  }

  /** On login: a cloud save wins; with no cloud save, upload this device. */
  async function pull(user: AuthUser, trainerName?: string) {
    if (!supabase || pulledFor === user.id) return;
    pulledFor = user.id;
    set({ status: "loading", error: null });
    const { data, error } = await supabase
      .from(SAVES_TABLE)
      .select("data, updated_at")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) {
      pulledFor = null;
      set({ status: "error", error: error.message });
      return;
    }
    const save = data?.data as SaveData | undefined;
    if (save?.version === 1) {
      applying = true;
      usePokemonStore.setState({ pokemons: save.pokemons ?? [] });
      useWorldStore.getState().hydrate(save.world ?? {});
      applying = false;
      set({ status: "saved", lastSavedAt: Date.parse(data!.updated_at) });
    } else {
      if (trainerName && !useWorldStore.getState().trainerName)
        useWorldStore.getState().setTrainerName(trainerName);
      if (hasLocalProgress() || trainerName) await push();
      else set({ status: "idle" });
    }
  }

  const schedulePush = () => {
    const user = get().user;
    if (applying || !user || pulledFor !== user.id) return;
    window.clearTimeout(pushTimer);
    pushTimer = window.setTimeout(() => void push(), 2500);
  };

  return {
    configured: !!supabase,
    ready: !supabase,
    user: null,
    status: "idle",
    lastSavedAt: null,
    error: null,

    init: () => {
      if (started || !supabase) return;
      started = true;

      usePokemonStore.subscribe(schedulePush);
      useWorldStore.subscribe((s, prev) => {
        // Steps tick on every tile; the position change already covers them.
        if (s.position !== prev.position || s.defeatedTrainers !== prev.defeatedTrainers || s.trainerName !== prev.trainerName || s.respawn !== prev.respawn)
          schedulePush();
      });
      window.addEventListener("pagehide", () => {
        if (get().user) void push();
      });

      supabase.auth.onAuthStateChange((event, session) => {
        const u = session?.user;
        const user = u ? { id: u.id, email: u.email ?? "" } : null;
        set({ user, ready: true });
        if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && user) {
          const name = (u?.user_metadata?.trainer_name as string | undefined) ?? undefined;
          // Let supabase finish its own work before we query.
          window.setTimeout(() => void pull(user, name), 0);
        }
      });
    },

    signUp: async (email, password, trainerName) => {
      if (!supabase) throw new Error("Accounts are not configured.");
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { trainer_name: trainerName },
          emailRedirectTo: `${window.location.origin}/account`,
        },
      });
      if (error) throw error;
      if (trainerName && !useWorldStore.getState().trainerName)
        useWorldStore.getState().setTrainerName(trainerName.toUpperCase());
      return { needsConfirm: !data.session };
    },

    signIn: async (email, password) => {
      if (!supabase) throw new Error("Accounts are not configured.");
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },

    signOut: async () => {
      if (!supabase) return;
      if (pulledFor === get().user?.id) await push();
      await supabase.auth.signOut();
      pulledFor = null;
      set({ user: null, status: "idle", lastSavedAt: null });
    },

    syncNow: async () => {
      const user = get().user;
      if (user && pulledFor === user.id) await push();
    },
  };
});
