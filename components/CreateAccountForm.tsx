"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type CreateAccountFormProps = {
  pdsHostname: string;
};

export function CreateAccountForm({ pdsHostname }: CreateAccountFormProps) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleValue = username.trim() ? `${username.trim().toLowerCase()}.${pdsHostname}` : "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!handleValue || !password) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/create-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handle: handleValue,
          password,
          ...(email.trim() && { email: email.trim() }),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Account creation failed");
      }

      router.push(`/?account_created=${encodeURIComponent(data.handle ?? handleValue)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Account creation failed");
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
          Username
        </label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="e.g. dave"
          className="w-full px-3 py-2 rounded-lg disabled:opacity-50"
          style={{
            border: "1px solid var(--border-color)",
            background: "var(--surface)",
            color: "var(--text-headline)",
          }}
          disabled={loading}
          autoComplete="username"
        />
        <p
          className="mt-1 text-xs"
          style={{ color: "var(--text-secondary)" }}
        >
          Your handle will be <strong>{handleValue || `username.${pdsHostname}`}</strong>
        </p>
      </div>

      <div>
        <label
          className="block text-sm font-medium mb-1"
          style={{ color: "var(--text-headline)" }}
        >
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 rounded-lg disabled:opacity-50"
          style={{
            border: "1px solid var(--border-color)",
            background: "var(--surface)",
            color: "var(--text-headline)",
          }}
          disabled={loading}
          autoComplete="new-password"
        />
      </div>

      <div>
        <label
          className="block text-sm font-medium mb-1"
          style={{ color: "var(--text-headline)" }}
        >
          Email <span className="font-normal" style={{ color: "var(--text-secondary)" }}>(optional)</span>
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full px-3 py-2 rounded-lg disabled:opacity-50"
          style={{
            border: "1px solid var(--border-color)",
            background: "var(--surface)",
            color: "var(--text-headline)",
          }}
          disabled={loading}
          autoComplete="email"
        />
      </div>

      {error && (
        <p className="text-sm" style={{ color: "var(--state-danger)" }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || !username.trim() || !password}
        className="btn-primary w-full py-2 px-4 disabled:opacity-50"
      >
        {loading ? "Creating account..." : "Create account"}
      </button>

      <p
        className="text-center text-sm"
        style={{ color: "var(--text-secondary)" }}
      >
        Already have an account?{" "}
        <Link href="/" className="link-brand hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
