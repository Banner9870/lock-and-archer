"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/oauth/logout", { method: "POST" });
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="text-sm font-medium hover:opacity-80 transition-opacity"
      style={{ color: "var(--text-secondary)" }}
    >
      Sign out
    </button>
  );
}

