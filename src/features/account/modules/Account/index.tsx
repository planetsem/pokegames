import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import * as S from "./index.style";
import { useAuthStore } from "@/store/app/authStore";
import { useWorldStore } from "@/store/app/worldStore";
import { usePokemonStore } from "@/store/app/pokemonStore";

type Tab = "login" | "signup";

const friendly = (msg: string) => {
  if (/invalid login/i.test(msg)) return "Wrong email or password.";
  if (/email not confirmed/i.test(msg))
    return "Confirm your email first. Check your inbox (and spam).";
  if (/already registered/i.test(msg))
    return "There is already an account with this email. Log in instead.";
  if (/password should be/i.test(msg))
    return "Your password needs at least 6 characters.";
  if (/rate limit/i.test(msg))
    return "Too many attempts. Wait a minute and try again.";
  return msg;
};

const AccountModule = () => {
  const navigate = useNavigate();
  const { configured, ready, user, status, lastSavedAt, error, signIn, signUp, signOut, syncNow } =
    useAuthStore();
  const trainerName = useWorldStore((s) => s.trainerName);
  const beaten = useWorldStore((s) => s.defeatedTrainers.length);
  const count = usePokemonStore((s) => s.pokemons.length);

  const [tab, setTab] = useState<Tab>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState(trainerName);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      if (tab === "signup") {
        if (!name.trim()) throw new Error("Pick a trainer name.");
        const { needsConfirm } = await signUp(email.trim(), password, name.trim().slice(0, 12));
        setMessage(
          needsConfirm
            ? { ok: true, text: "Almost there! We sent you an email. Click the link in it, then log in here." }
            : { ok: true, text: "Account created! Your progress is now saved in the cloud." },
        );
        if (needsConfirm) setTab("login");
      } else {
        await signIn(email.trim(), password);
        setMessage({ ok: true, text: "Welcome back! Your save is loaded." });
      }
    } catch (err) {
      setMessage({ ok: false, text: friendly((err as Error).message) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <S.Page>
      <S.Card>
        <S.Title>Trainer Account</S.Title>

        {!configured ? (
          <S.Note>
            Accounts aren't switched on for this site yet. Your progress is
            saved on this device.
          </S.Note>
        ) : !ready ? (
          <S.Note>Loading...</S.Note>
        ) : user ? (
          <>
            <S.Profile>
              <S.Big>{trainerName || "Trainer"}</S.Big>
              <span>{user.email}</span>
              <span>
                {count} Pokemon · {beaten} trainers beaten
              </span>
              <span>
                {status === "syncing" || status === "loading"
                  ? "Saving..."
                  : status === "error"
                    ? `Save failed: ${error}`
                    : lastSavedAt
                      ? `Saved to the cloud at ${new Date(lastSavedAt).toLocaleTimeString()}`
                      : "Cloud save is on"}
              </span>
            </S.Profile>
            <S.Row>
              <S.Primary onClick={() => navigate({ to: "/world" })}>Play</S.Primary>
              <S.Secondary onClick={() => void syncNow()}>Save now</S.Secondary>
              <S.Secondary onClick={() => void signOut()}>Log out</S.Secondary>
            </S.Row>
          </>
        ) : (
          <>
            <S.Tabs>
              <S.Tab active={tab === "signup"} onClick={() => setTab("signup")}>
                Sign up
              </S.Tab>
              <S.Tab active={tab === "login"} onClick={() => setTab("login")}>
                Log in
              </S.Tab>
            </S.Tabs>
            <S.Form onSubmit={submit}>
              {tab === "signup" && (
                <label>
                  Trainer name
                  <input
                    value={name}
                    maxLength={12}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="nickname"
                    required
                  />
                </label>
              )}
              <label>
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  value={password}
                  minLength={6}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={tab === "signup" ? "new-password" : "current-password"}
                  required
                />
              </label>
              <S.Primary type="submit" disabled={busy}>
                {busy ? "..." : tab === "signup" ? "Create account" : "Log in"}
              </S.Primary>
            </S.Form>
            <S.Note>
              {tab === "signup"
                ? "Your Pokemon and progress on this device are saved to your new account."
                : "Logging in loads your cloud save on this device."}
            </S.Note>
          </>
        )}

        {message && <S.Message ok={message.ok}>{message.text}</S.Message>}

        <S.Links>
          <Link to="/world">World</Link>
          <Link to="/my-pokemon">My Pokemon</Link>
          <Link to="/pokemons">Pokedex</Link>
        </S.Links>
      </S.Card>
    </S.Page>
  );
};

export default AccountModule;
