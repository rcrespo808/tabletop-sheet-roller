"use client";

import { useEffect } from "react";
import { AuthPanel } from "@/components/AuthPanel";
import { ActiveTableBar } from "@/components/campaign/ActiveTableBar";
import { CampaignPageHeader, type CampaignPageHeaderProps } from "@/components/campaign/CampaignPageHeader";
import { SeatModeTabs, type SeatMode } from "@/components/campaign/SeatModeTabs";
import type { CampaignSeat } from "@/lib/session/useCampaignSeat";
import type { AuthState } from "@/lib/auth/supabaseAuth";

export type CampaignShellProps = {
  header: Omit<CampaignPageHeaderProps, "actions"> & { actions?: React.ReactNode };
  seat: CampaignSeat;
  mode: SeatMode;
  onModeChange: (mode: SeatMode) => void;
  requireTable?: boolean;
  onAuthChange?: (state: AuthState) => void;
  message?: string | null;
  error?: string | null;
  toolbar?: React.ReactNode;
  children: React.ReactNode;
};

export function CampaignShell({
  header,
  seat,
  mode,
  onModeChange,
  requireTable = false,
  onAuthChange,
  message,
  error,
  toolbar,
  children
}: CampaignShellProps) {
  useEffect(() => {
    if (!seat.canManage && mode === "manage") {
      onModeChange("play");
    }
  }, [seat.canManage, mode, onModeChange]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <CampaignPageHeader {...header} />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <AuthPanel onAuthChange={onAuthChange} />
        <ActiveTableBar requireTable={requireTable} seat={seat} />
        <SeatModeTabs active={mode} canManage={seat.canManage} onChange={onModeChange} />
        {toolbar ? <div className="mt-4">{toolbar}</div> : null}
        {message ? (
          <div className="mt-4 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            {message}
          </div>
        ) : null}
        {error ? (
          <div className="mt-4 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        ) : null}
        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}
