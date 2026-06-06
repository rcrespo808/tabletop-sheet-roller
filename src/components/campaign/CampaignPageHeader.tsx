"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { StorageStatusBadge } from "@/components/StorageStatusBadge";
import type { StorageMode } from "@/lib/storage/types";

export type CampaignModuleLink = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export type CampaignPageHeaderProps = {
  icon: LucideIcon;
  iconGradient: string;
  eyebrow: string;
  title: string;
  description: string;
  moduleLinks?: CampaignModuleLink[];
  storageMode?: StorageMode;
  actions?: React.ReactNode;
};

export function CampaignPageHeader({
  icon: Icon,
  iconGradient,
  eyebrow,
  title,
  description,
  moduleLinks = [],
  storageMode,
  actions
}: CampaignPageHeaderProps) {
  return (
    <header className="border-b border-slate-700/20 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br shadow-lg ${iconGradient}`}
            >
              <Icon className="h-6 w-6 text-white" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase text-slate-300">{eyebrow}</p>
              <h1 className="mt-1 text-3xl font-bold text-foreground sm:text-4xl">{title}</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {storageMode ? <StorageStatusBadge mode={storageMode} /> : null}
            {moduleLinks.map((link) => (
              <Link
                className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-700/40 bg-slate-900/60 px-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-800/70"
                href={link.href}
                key={link.href}
              >
                <link.icon className="h-4 w-4" aria-hidden="true" />
                {link.label}
              </Link>
            ))}
            {actions}
          </div>
        </div>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
    </header>
  );
}
