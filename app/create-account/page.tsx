import { redirect } from "next/navigation";
import Link from "next/link";
import { isCreateAccountAvailable, getPdsHostnameForSignup } from "@/lib/config";
import { CreateAccountForm } from "@/components/CreateAccountForm";

export default function CreateAccountPage() {
  if (!isCreateAccountAvailable()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <main className="w-full max-w-md mx-auto p-8 text-center">
          <p className="text-zinc-600 dark:text-zinc-400 mb-4">
            Create account is not configured (PDS_APP_URL is not set).
          </p>
          <Link href="/" className="text-blue-600 dark:text-blue-400 hover:underline">
            Back to home
          </Link>
        </main>
      </div>
    );
  }

  const pdsHostname = getPdsHostnameForSignup();
  if (!pdsHostname) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <main className="w-full max-w-md mx-auto p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            Create an account
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 text-sm">
            Create an account on our test PDS to sign in and set your status.
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
          <CreateAccountForm pdsHostname={pdsHostname} />
        </div>
      </main>
    </div>
  );
}
