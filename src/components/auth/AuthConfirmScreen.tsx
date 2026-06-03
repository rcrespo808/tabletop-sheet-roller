"use client";

import type { EmailOtpType } from "@supabase/supabase-js";
import { CheckCircle2, Loader2, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getAppUserProfile } from "@/lib/auth/supabaseAuth";
import { GlassPanel } from "@/components/GlassPanel";
import { getSupabaseClient } from "@/lib/storage/supabaseClient";

type ConfirmStatus = "loading" | "success" | "error";

export function AuthConfirmScreen() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<ConfirmStatus>("loading");
  const [message, setMessage] = useState("Confirming your account…");

  useEffect(() => {
    const supabaseClient = getSupabaseClient();
    if (!supabaseClient) {
      setStatus("error");
      setMessage("Supabase is not configured for this deployment.");
      return;
    }

    const auth = supabaseClient.auth;
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    async function finishSuccess() {
      if (cancelled) return;
      setStatus("success");
      setMessage("Your account is verified. Redirecting you to Dicer…");
      const next = searchParams.get("next");
      const destination = next?.startsWith("/") ? next : "/";
      window.setTimeout(() => router.replace(destination), 1800);
    }

    async function confirmFromLink() {
      const authError =
        searchParams.get("error_description") ?? searchParams.get("error");
      if (authError) {
        setStatus("error");
        setMessage(authError);
        return;
      }

      const tokenHash = searchParams.get("token_hash");
      const type = searchParams.get("type") as EmailOtpType | null;
      const code = searchParams.get("code");

      try {
        if (tokenHash && type) {
          const { error } = await auth.verifyOtp({
            type,
            token_hash: tokenHash
          });
          if (error) throw error;
        } else if (code) {
          const { error } = await auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        const { data, error: sessionError } = await auth.getSession();
        if (sessionError) throw sessionError;

        if (data.session?.user) {
          await getAppUserProfile(data.session.user);
          await finishSuccess();
          return;
        }

        const { data: authListener } = auth.onAuthStateChange(
          async (event, session) => {
            if (cancelled || event !== "SIGNED_IN" || !session?.user) return;
            await getAppUserProfile(session.user);
            unsubscribe?.();
            await finishSuccess();
          }
        );
        unsubscribe = () => authListener.subscription.unsubscribe();

        window.setTimeout(async () => {
          if (cancelled) return;
          const { data: retry } = await auth.getSession();
          if (retry.session?.user) {
            await getAppUserProfile(retry.session.user);
            unsubscribe?.();
            await finishSuccess();
            return;
          }

          unsubscribe?.();
          setStatus("error");
          setMessage(
            "This verification link is invalid or has expired. Request a new confirmation email from the home page."
          );
        }, 5000);
      } catch (caught) {
        if (cancelled) return;
        setStatus("error");
        setMessage(
          caught instanceof Error
            ? caught.message
            : "We could not verify your account. Try signing in again."
        );
      }
    }

    void confirmFromLink();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [router, searchParams]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <GlassPanel level="secondary" glow="medium" className="max-w-md p-8 text-center">
        {status === "loading" ? (
          <Loader2
            className="mx-auto h-10 w-10 animate-spin text-cyan-300"
            aria-hidden="true"
          />
        ) : null}
        {status === "success" ? (
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-300" aria-hidden="true" />
        ) : null}
        {status === "error" ? (
          <ShieldAlert className="mx-auto h-10 w-10 text-red-300" aria-hidden="true" />
        ) : null}

        <p className="mt-4 text-sm font-semibold uppercase tracking-wide text-cyan-200">
          Account verification
        </p>
        <h1 className="mt-3 text-2xl font-bold text-foreground">
          {status === "success"
            ? "You are verified"
            : status === "error"
              ? "Verification failed"
              : "Verifying…"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{message}</p>

        {status !== "loading" ? (
          <Link
            className="mt-6 inline-flex h-11 items-center justify-center rounded-lg border border-cyan-500/40 bg-cyan-500/20 px-4 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/30"
            href="/"
          >
            Back to gallery
          </Link>
        ) : null}
      </GlassPanel>
    </main>
  );
}
