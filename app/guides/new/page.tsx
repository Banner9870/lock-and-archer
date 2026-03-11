"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewGuidePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const t = title.trim();
    if (!t) {
      setError("Title is required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/guides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: t,
          description: description.trim() || undefined,
          slug: slug.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create guide");
        setSubmitting(false);
        return;
      }
      const segment = data.slug ?? data.rkey ?? data.uri?.split("/").pop();
      if (segment) {
        router.push(`/guides/${encodeURIComponent(segment)}`);
      } else {
        router.push("/guides");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <h1
          className="font-heading text-2xl font-bold"
          style={{ color: "var(--text-headline)" }}
        >
          Create a guide
        </h1>
        <Link href="/guides" className="text-sm hover:underline link-brand">
          Cancel
        </Link>
      </div>

      <form
        onSubmit={handleSubmit}
        className="feed-card p-6 space-y-4"
      >
        {error && (
          <p className="text-sm" style={{ color: "var(--state-danger)" }}>
            {error}
          </p>
        )}
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium mb-1"
            style={{ color: "var(--text-headline)" }}
          >
            Title
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full px-3 py-2 rounded-lg"
            style={{
              border: "1px solid var(--border-color)",
              background: "var(--surface)",
              color: "var(--text-headline)",
            }}
            placeholder="My guide"
          />
        </div>
        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium mb-1"
            style={{ color: "var(--text-headline)" }}
          >
            Description (optional)
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded-lg"
            style={{
              border: "1px solid var(--border-color)",
              background: "var(--surface)",
              color: "var(--text-headline)",
            }}
            placeholder="What's this guide about?"
          />
        </div>
        <div>
          <label
            htmlFor="slug"
            className="block text-sm font-medium mb-1"
            style={{ color: "var(--text-headline)" }}
          >
            URL slug (optional)
          </label>
          <input
            id="slug"
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="w-full px-3 py-2 rounded-lg"
            style={{
              border: "1px solid var(--border-color)",
              background: "var(--surface)",
              color: "var(--text-headline)",
            }}
            placeholder="my-guide"
          />
          <p
            className="mt-1 text-xs"
            style={{ color: "var(--text-secondary)" }}
          >
            Used for a readable URL, e.g. /guides/my-guide
          </p>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="btn-primary w-full py-2 px-4 disabled:opacity-50 text-sm font-medium"
        >
          {submitting ? "Creating…" : "Create guide"}
        </button>
      </form>
    </>
  );
}
