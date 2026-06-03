import { Suspense } from "react";
import { AuthConfirmScreen } from "@/components/auth/AuthConfirmScreen";
import { GlassPanel } from "@/components/GlassPanel";

function AuthConfirmFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <GlassPanel level="secondary" glow="medium" className="max-w-md p-8 text-center">
        <p className="text-sm font-semibold uppercase text-cyan-200">Account verification</p>
        <h1 className="mt-3 text-2xl font-bold text-foreground">Loading…</h1>
      </GlassPanel>
    </main>
  );
}

export default function AuthConfirmPage() {
  return (
    <Suspense fallback={<AuthConfirmFallback />}>
      <AuthConfirmScreen />
    </Suspense>
  );
}
