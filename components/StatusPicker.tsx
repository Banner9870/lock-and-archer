"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const EMOJIS = [
  "👍",
  "👎",
  "💙",
  "🔥",
  "😆",
  "😢",
  "🤔",
  "😴",
  "🎉",
  "🤩",
  "😭",
  "🥳",
  "😤",
  "💀",
  "✨",
  "👀",
  "🙏",
  "📚",
  "💻",
  "🍕",
  "🌴",
];

interface StatusPickerProps {
  currentStatus?: string | null;
}

export function StatusPicker({ currentStatus }: StatusPickerProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(currentStatus ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSelect(emoji: string) {
    setLoading(true);
    setError(null);
    setSelected(emoji);

    try {
      const res = await fetch("/api/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: emoji }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Failed to update status"
        );
      }

      router.refresh();
    } catch (err) {
      console.error("Failed to update status:", err);
      setError(err instanceof Error ? err.message : "Failed to update status");
      setSelected(currentStatus ?? null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <p
        className="text-sm mb-3"
        style={{ color: "var(--text-secondary)" }}
      >
        Set your status
      </p>
      {error && (
        <p className="text-sm mb-3" style={{ color: "var(--state-danger)" }}>
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => handleSelect(emoji)}
            disabled={loading}
            className="text-2xl p-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
            style={
              selected === emoji
                ? {
                    background: "color-mix(in srgb, var(--brand-red) 20%, transparent)",
                    outline: "2px solid var(--brand-red)",
                    outlineOffset: "2px",
                  }
                : { background: "transparent" }
            }
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
