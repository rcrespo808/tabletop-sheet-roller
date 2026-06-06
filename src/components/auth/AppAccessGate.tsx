"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  canAccessApp,
  canReviewPlayers,
  isLocalMode,
  isSignedIn
} from "@/lib/auth/accessControl";
import { fetchIsTableGmAnywhere } from "@/lib/auth/tableGmAccess";
import {
  getCurrentAuthState,
  onAuthStateChanged,
  type AuthState
} from "@/lib/auth/supabaseAuth";
import { GlassPanel } from "@/components/GlassPanel";

function isPublicPath(pathname: string): boolean {
  return pathname === "/login" || pathname.startsWith("/auth/confirm");
}

function isPendingBootstrapPath(pathname: string): boolean {
  return pathname === "/pending" || pathname === "/tables";
}

function isReviewPath(pathname: string): boolean {
  return pathname === "/review/players";
}

export function AppAccessGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState | null>(null);
  const [isTableGmAnywhere, setIsTableGmAnywhere] = useState(false);
  const [loading, setLoading] = useState(!isLocalMode());

  useEffect(() => {
    if (isLocalMode()) return;

    let mounted = true;

    getCurrentAuthState().then(async (state) => {
      if (!mounted) return;
      setAuthState(state);
      if (state.user) {
        setIsTableGmAnywhere(await fetchIsTableGmAnywhere());
      } else {
        setIsTableGmAnywhere(false);
      }
      setLoading(false);
    });

    const unsubscribe = onAuthStateChanged((state) => {
      if (!mounted) return;
      setAuthState(state);
      if (state.user) {
        void fetchIsTableGmAnywhere().then((value) => {
          if (mounted) setIsTableGmAnywhere(value);
        });
      } else {
        setIsTableGmAnywhere(false);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const accessContext = useMemo(
    () => ({ isTableGmAnywhere }),
    [isTableGmAnywhere]
  );

  const hasAppAccess = canAccessApp(authState, accessContext);
  const mayReview = canReviewPlayers(authState, accessContext);
  const signedIn = isSignedIn(authState);

  useEffect(() => {
    if (isLocalMode() || loading) return;

    if (!signedIn && !isPublicPath(pathname)) {
      router.replace("/login");
      return;
    }

    if (signedIn && pathname === "/login") {
      router.replace(hasAppAccess ? "/" : "/pending");
      return;
    }

    if (signedIn && hasAppAccess && pathname === "/pending") {
      router.replace("/");
      return;
    }

    if (signedIn && !hasAppAccess && !isPublicPath(pathname)) {
      if (isPendingBootstrapPath(pathname)) return;
      if (isReviewPath(pathname) && mayReview) return;
      router.replace("/pending");
      return;
    }

    if (signedIn && hasAppAccess && isReviewPath(pathname) && !mayReview) {
      router.replace("/");
    }
  }, [
    hasAppAccess,
    loading,
    mayReview,
    pathname,
    router,
    signedIn
  ]);

  if (isLocalMode()) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
        <GlassPanel level="secondary" className="max-w-md p-8 text-center">
          <p className="text-sm text-muted-foreground">Checking access…</p>
        </GlassPanel>
      </main>
    );
  }

  if (!signedIn && !isPublicPath(pathname)) {
    return null;
  }

  if (signedIn && !hasAppAccess && !isPublicPath(pathname)) {
    if (isPendingBootstrapPath(pathname)) return <>{children}</>;
    if (isReviewPath(pathname) && mayReview) return <>{children}</>;
    return null;
  }

  if (signedIn && pathname === "/login") {
    return null;
  }

  if (signedIn && hasAppAccess && isReviewPath(pathname) && !mayReview) {
    return null;
  }

  return <>{children}</>;
}
