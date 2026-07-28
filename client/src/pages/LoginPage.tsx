import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { setToken } from "../api/auth";

export default function LoginPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!password) return;

    setError("");
    setLoading(true);

    try {
      const { token } = await api.adminLogin(password);
      setToken(token);
      navigate("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-surface-bright p-md">
      <div className="w-full max-w-md border border-outline-variant bg-surface-container-lowest p-xl">
        <h1 className="text-h2 font-bold text-primary">Bluefox Admin Panel</h1>
        <p className="mt-sm text-body-md text-on-surface-variant">Enter your admin password to access the dashboard</p>

        <form onSubmit={handleSubmit} className="mt-lg flex flex-col gap-md">
          <div>
            <label htmlFor="password" className="text-label-sm uppercase text-on-surface-variant">
              Admin Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-xs w-full border border-outline-variant bg-surface-container-lowest px-md py-sm text-body-md text-primary focus:border-secondary focus:outline-none"
              required
            />
          </div>

          {error && (
            <p className="rounded bg-error-container px-md py-sm text-label-md text-on-error-container">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="mt-sm w-full bg-primary py-md text-label-md text-on-primary transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
