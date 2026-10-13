import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { api, errorText } from "../api";
import { useAuth } from "../auth";

export default function Login() {
  const { admin, login } = useAuth();
  const navigate = useNavigate();
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ needsSetup: boolean }>("/auth/setup-status").then((r) => setNeedsSetup(r.needsSetup)).catch((e) => { setError(errorText(e)); setNeedsSetup(false); });
  }, []);
  if (admin) return <Navigate to="/" replace />;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email")), password = String(f.get("password"));
    setBusy(true);
    setError("");
    try {
      if (needsSetup) await api("/auth/setup", { method: "POST", body: { email, password, setupToken: String(f.get("setupToken")) } });
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  if (needsSetup === null) return <p className="center">Loading…</p>;
  return (
    <form className="card login" onSubmit={submit}>
      <h1>{needsSetup ? "Create your admin account" : "Sign in"}</h1>
      {needsSetup && <p className="muted">First-time setup. Use the SETUP_TOKEN from your server .env file.</p>}
      <label className="field"><span>Email</span><input name="email" type="email" required autoComplete="username" /></label>
      <label className="field"><span>Password{needsSetup && " (at least 12 characters)"}</span><input name="password" type="password" required minLength={needsSetup ? 12 : 1} autoComplete={needsSetup ? "new-password" : "current-password"} /></label>
      {needsSetup && <label className="field"><span>Setup token</span><input name="setupToken" type="password" required /></label>}
      {error && <p role="alert" className="error">{error}</p>}
      <button className="btn primary" disabled={busy}>{busy ? "Please wait…" : needsSetup ? "Create account" : "Sign in"}</button>
    </form>
  );
}
