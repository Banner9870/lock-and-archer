import { redirect } from "next/navigation";
import Link from "next/link";
import { isCreateAccountAvailable, getPdsHostnameForSignup } from "@/lib/config";
import { CreateAccountForm } from "@/components/CreateAccountForm";

export default function CreateAccountPage() {
  if (!isCreateAccountAvailable()) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-8 text-center">
        <div>
          <p
            className="mb-4 text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            Create account is not configured (PDS_APP_URL is not set).
          </p>
          <Link href="/" className="link-brand hover:underline">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  const pdsHostname = getPdsHostnameForSignup();
  if (!pdsHostname) {
    redirect("/");
  }

  return (
    <>
      <div className="text-center mb-8">
        <h1
          className="font-heading text-2xl font-bold mb-2"
          style={{ color: "var(--text-headline)" }}
        >
          Create an account
        </h1>
        <p
          className="text-sm"
          style={{ color: "var(--text-secondary)" }}
        >
          Create an account on our test PDS to sign in and set your status.
        </p>
      </div>

      <div className="feed-card p-6">
        <CreateAccountForm pdsHostname={pdsHostname} />
      </div>
    </>
  );
}
