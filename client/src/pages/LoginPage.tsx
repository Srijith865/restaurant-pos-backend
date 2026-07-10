import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { setToken } from "../api/auth";

export default function LoginPage() {
  const navigate = useNavigate();
  const [waiters, setWaiters] = useState<{ WaiterID: number; WaiterName: string }[]>([]);
  const [selectedWaiterId, setSelectedWaiterId] = useState<string>("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    api.getWaiters()
      .then(data => {
        setWaiters(data);
        if (data.length > 0) setSelectedWaiterId(data[0].WaiterID.toString());
      })
      .catch(() => {
        setError("Failed to load waiters. Is the backend running?");
      })
      .finally(() => setFetching(false));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedWaiterId) return;

    setError("");
    setLoading(true);

    try {
      const { token } = await api.login(parseInt(selectedWaiterId, 10));
      setToken(token);
      navigate("/pos");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-surface-bright p-md">
      <div className="w-full max-w-md border border-outline-variant bg-surface-container-lowest p-xl">
        <h1 className="text-h2 font-bold text-primary">Bluefox POS</h1>
        <p className="mt-sm text-body-md text-on-surface-variant">Select your name to sign in</p>

        {fetching ? (
          <p className="mt-lg text-body-md text-on-surface-variant">Loading staff...</p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-lg flex flex-col gap-md">
            <div>
              <label htmlFor="waiter" className="text-label-sm uppercase text-on-surface-variant">
                Waiter Name
              </label>
              <select
                id="waiter"
                value={selectedWaiterId}
                onChange={(e) => setSelectedWaiterId(e.target.value)}
                className="mt-xs w-full border border-outline-variant bg-surface-container-lowest px-md py-sm text-body-md text-primary focus:border-secondary focus:outline-none"
                required
              >
                {waiters.map(w => (
                  <option key={w.WaiterID} value={w.WaiterID}>
                    {w.WaiterName}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <p className="rounded bg-error-container px-md py-sm text-label-md text-on-error-container">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !selectedWaiterId}
              className="mt-sm w-full bg-primary py-md text-label-md text-on-primary transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
