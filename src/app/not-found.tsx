import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-charcoal px-4 text-zinc-100">
      <div className="max-w-md text-center">
        <p className="text-sm font-semibold uppercase text-nwod-teal">Not Found</p>
        <h1 className="mt-3 text-3xl font-bold text-white">Character unavailable</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          The requested character is not in the local seed data.
        </p>
        <Link
          className="mt-6 inline-flex h-11 items-center justify-center rounded-md bg-white px-4 text-sm font-semibold text-charcoal transition hover:bg-zinc-200"
          href="/"
        >
          Back to Gallery
        </Link>
      </div>
    </main>
  );
}
