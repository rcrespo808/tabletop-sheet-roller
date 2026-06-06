"use client";

import Link from "next/link";
import { BookOpen, Coins, FileText, Gift, Swords } from "lucide-react";
import { GlassPanel } from "@/components/GlassPanel";
import { setActiveTableId } from "@/lib/session/activeTable";

const MODULE_LINKS = [
  { href: "/combat", label: "Combat", icon: Swords },
  { href: "/markets", label: "Markets", icon: Coins },
  { href: "/handouts", label: "Handouts", icon: FileText },
  { href: "/loot", label: "Loot", icon: Gift },
  { href: "/codex", label: "Codex", icon: BookOpen }
] as const;

export function CampaignDashboard({
  tableId,
  memberCount,
  assignmentCount
}: {
  tableId: string;
  memberCount: number;
  assignmentCount: number;
}) {
  return (
    <GlassPanel level="secondary" className="space-y-4 p-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Campaign modules</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {memberCount} member{memberCount === 1 ? "" : "s"} · {assignmentCount} character
          assignment{assignmentCount === 1 ? "" : "s"}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {MODULE_LINKS.map((link) => (
          <Link
            className="inline-flex h-10 items-center gap-2 rounded-md border border-cyan-500/30 bg-cyan-950/30 px-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-900/40"
            href={link.href}
            key={link.href}
            onClick={() => setActiveTableId(tableId)}
          >
            <link.icon className="h-4 w-4" aria-hidden="true" />
            {link.label}
          </Link>
        ))}
      </div>
    </GlassPanel>
  );
}
