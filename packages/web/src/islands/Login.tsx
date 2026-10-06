import { useEffect, useState } from "preact/hooks";
import { api, HttpError } from "../lib/api";

// Same rule as the server's SAFE_NEXT (packages/server/src/auth.ts): one leading slash, never `//` or `/\`, no scheme.
const SAFE_NEXT = /^\/(?!\/|\\)[A-Za-z0-9_\-./?=&%:+,~]*$/;
const safeNext = (n: string | null): string | undefined => (n && SAFE_NEXT.test(n) ? n : undefined);

export default function Login() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [next, setNext] = useState<string | undefined>(undefined);
  const [urlError, setUrlError] = useState<string | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const n = safeNext(q.get("next")); if (n) setNext(n);
    if (q.get("error") === "expired") setUrlError("That sign-in link has expired or was already used. Request a new one.");
    // Already signed in? Go straight to the app.
    api.auth.me().then(() => location.replace(n ?? "/app")).catch(() => { /* not signed in */ });
  }, []);

  async function submit(e: Event) {
    e.preventDefault();
    setState("sending"); setError(null);
    try { await api.auth.magic(email.trim(), next); setState("sent"); }
    catch (err) { setError(err instanceof HttpError ? err.message : "Could not reach the sign-in service."); setState("error"); }
  }

  if (state === "sent") return (
    <div class="card p-6" role="status">
      <h1 class="text-xl font-semibold">Check your inbox</h1>
      <p class="mt-2 text-sm text-muted">If <span class="text-fg">{email}</span> is a valid address, a sign-in link is on its way. It works once and expires in 15 minutes.</p>
      <p class="mt-4 text-xs text-faint">Running locally without an email provider? The link is printed in the server log.</p>
      <button type="button" class="btn mt-5" onClick={() => setState("idle")}>Use a different email</button>
    </div>
  );
  return (
    <form onSubmit={submit} class="card p-6">
      <h1 class="text-xl font-semibold">Sign in</h1>
      <p class="mt-1 text-sm text-muted">No password. We email you a link. Your first sign-in creates your account and a project named after your email domain.</p>
      {urlError && <p class="mt-4 rounded-md border border-warn/40 bg-warn-dim px-3 py-2 text-sm text-warn" role="alert">{urlError}</p>}
      <label class="mt-5 block text-sm">Email
        <input type="email" required autocomplete="email" class="field mt-1" value={email} onInput={(e) => setEmail((e.target as HTMLInputElement).value)} placeholder="you@company.com" />
      </label>
      {error && <p class="mt-3 text-sm text-danger" role="alert">{error}</p>}
      <button type="submit" class="btn btn-primary mt-5 w-full" disabled={state === "sending"}>{state === "sending" ? "Sending…" : "Email me a sign-in link"}</button>
      <p class="mt-4 text-xs text-faint">By signing in you agree to the <a href="/terms" class="underline">terms</a> and <a href="/privacy" class="underline">privacy policy</a>.</p>
    </form>
  );
}
