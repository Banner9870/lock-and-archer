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
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <main className="w-full max-w-md mx-auto p-8">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Create a guide
          </h1>
          <Link
            href="/guides"
            className="text-sm text-zinc-500 dark:text-zinc-400 hover:underline"
          >
            Cancel
          </Link>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 space-y-4"
        >
          {error && (
            <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>
          )}
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
            >
              Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
              placeholder="My guide"
            />
          </div>
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
            >
              Description (optional)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
              placeholder="What's this guide about?"
            />
          </div>
          <div>
            <label
              htmlFor="slug"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
            >
              URL slug (optional)
            </label>
            <input
              id="slug"
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
              placeholder="my-guide"
            />
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Used for a readable URL, e.g. /guides/my-guide
            </p>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2 px-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 text-sm font-medium"
          >
            {submitting ? "Creating…" : "Create guide"}
          </button>
        </form>
      </main>
    </div>
  );
}
