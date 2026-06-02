"use client";

import { GlassPanel } from "@/components/GlassPanel";
import type { CombatLogEntry } from "@/lib/combat/types";
import {
  MESSAGE_TONE_CLASSES,
  formatCombatMessageLine,
  parseFeedbackFromRecentResult,
  type RpgRecentResult
} from "@/lib/combat/rpgmCombatFeedback";

function MessageLine({
  headline,
  body,
  hpDelta,
  tone
}: {
  headline: string;
  body?: string;
  hpDelta?: string;
  tone: keyof typeof MESSAGE_TONE_CLASSES;
}) {
  return (
    <article className={`rounded-md border p-3 ${MESSAGE_TONE_CLASSES[tone]}`}>
      <p className="text-sm font-semibold leading-snug">{headline}</p>
      {hpDelta ? <p className="mt-1 text-xs font-medium tabular-nums opacity-90">{hpDelta}</p> : null}
      {body ? (
        <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed opacity-85">{body}</p>
      ) : null}
    </article>
  );
}

export function CombatMessageWindow({
  recentResult,
  actionHistory
}: {
  recentResult?: RpgRecentResult | null;
  actionHistory: CombatLogEntry[];
}) {
  const historyLines = (actionHistory ?? []).slice(0, 5);
  const recentFeedback = parseFeedbackFromRecentResult(recentResult);
  const recentMessage = recentFeedback ? formatCombatMessageLine(recentFeedback) : null;
  const historyMessages = historyLines.map((entry) => formatCombatMessageLine(entry));

  const showRecent =
    recentMessage &&
    (!historyMessages[0] || recentMessage.headline !== historyMessages[0].headline);

  return (
    <GlassPanel level="secondary" className="p-4 sm:p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Message Window
      </h2>
      <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
        {showRecent ? (
          <MessageLine
            body={recentMessage.body}
            headline={recentMessage.headline}
            hpDelta={recentMessage.hpDelta}
            tone={recentMessage.tone}
          />
        ) : null}
        {historyMessages.length === 0 && !showRecent ? (
          <p className="rounded-md border border-dashed border-slate-700/25 p-4 text-sm italic text-muted-foreground">
            Combat begins...
          </p>
        ) : (
          historyMessages.map((line) => (
            <MessageLine
              body={line.body}
              headline={line.headline}
              hpDelta={line.hpDelta}
              key={line.id}
              tone={line.tone}
            />
          ))
        )}
      </div>
    </GlassPanel>
  );
}
