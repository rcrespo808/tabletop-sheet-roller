import Link from "next/link";
import { GlassPanel } from "@/components/GlassPanel";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <GlassPanel level="secondary" glow="medium" className="max-w-md p-8 text-center">
        <p className="text-sm font-semibold uppercase text-cyan-200">Not Found</p>
        <h1 className="mt-3 text-3xl font-bold text-foreground">Character unavailable</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          The requested character is not in the local seed data.
        </p>
        <Link
          className="mt-6 inline-flex h-11 items-center justify-center rounded-lg border border-purple-500/40 bg-purple-500/20 px-4 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/30"
          href="/"
        >
          Back to Gallery
        </Link>
      </GlassPanel>
    </main>
  );
}
