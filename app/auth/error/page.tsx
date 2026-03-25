import Link from "next/link";

export default function AuthErrorPage() {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-lg items-center px-6 py-16">
      <div className="w-full rounded-2xl border border-border bg-surface-1 p-8">
        <h1 className="text-2xl font-semibold">Authentication Error</h1>
        <p className="mt-3 text-sm text-muted">
          There was a problem with your authentication request. Try again or return to the home page.
        </p>
        <Link href="/" className="mt-6 inline-block text-sm text-accent-strong hover:underline">
          Back to Home
        </Link>
      </div>
    </main>
  );
}
