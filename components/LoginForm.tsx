"use client";

import { useState, useEffect } from "react";

type LoginFormProps = {
  /** Pre-fill handle after account creation redirect */
  defaultHandle?: string;
};

export function LoginForm({ defaultHandle }: LoginFormProps) {
  const [handle, setHandle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (defaultHandle) setHandle(defaultHandle);
  }, [defaultHandle]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/oauth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      // Redirect to authorization server
      window.location.href = data.redirectUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          className="block text-sm font-medium mb-1"
          style={{ color: "var(--text-headline)" }}
        >
          Handle
        </label>
        <input
          type="text"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="alice.your-pds.up.railway.app"
          className="w-full px-3 py-2 rounded-lg disabled:opacity-50"
          style={{
            border: "1px solid var(--border-color)",
            background: "var(--surface)",
            color: "var(--text-headline)",
          }}
          disabled={loading}
        />
        <p
          className="mt-1 text-xs"
          style={{ color: "var(--text-secondary)" }}
        >
          Use your full handle; for a test PDS it must match the PDS hostname (e.g. alice.lock-and-archer-pds-production.up.railway.app).
        </p>
      </div>

      {error && (
        <p className="text-sm" style={{ color: "var(--state-danger)" }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || !handle}
        className="btn-primary w-full py-2 px-4 disabled:opacity-50"
      >
        {loading ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}

