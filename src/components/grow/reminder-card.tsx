"use client";

import { useEffect, useMemo, useState } from "react";
import { BellRing, X } from "lucide-react";
import { deliver, due, markSent, toggleMute, type Reminder } from "@/lib/grow/notify";
import type { Settings } from "@/lib/grow/settings";
import type { Baby, BabyData } from "@/lib/grow/store";

/**
 * The in-app end of the scheduler (12.5). It shows at most one reminder, and
 * every dismissal offers the mute — a reminder you cannot turn off from the
 * place it interrupted you is how an app earns a permanently revoked
 * notification permission.
 */
export function ReminderCard({
  baby,
  data,
  settings,
  onGo,
}: {
  baby: Baby;
  data: BabyData;
  settings: Settings;
  onGo: (where: Reminder["goto"]) => void;
}) {
  const [gone, setGone] = useState<string[]>([]);
  const next = useMemo(() => due(baby, data, settings), [baby, data, settings]);
  const shown = next && !gone.includes(next.id) ? next : null;

  // Handing it to the system is the side effect; what to show is derived.
  useEffect(() => {
    if (shown && deliver(shown)) markSent(shown);
  }, [shown]);

  if (!shown) return null;

  return (
    <section className="remind-card">
      <span className="remind-icon">
        <BellRing className="size-5" />
      </span>
      <div className="remind-text">
        <p className="remind-title">{shown.title}</p>
        <p className="remind-body">{shown.body}</p>
        <div className="remind-actions">
          <button
            type="button"
            className="remind-go"
            onClick={() => {
              markSent(shown);
              setGone([...gone, shown.id]);
              onGo(shown.goto);
            }}
          >
            去看看
          </button>
          <button
            type="button"
            className="remind-mute"
            onClick={() => {
              toggleMute(shown.kind);
              setGone([...gone, shown.id]);
            }}
          >
            这类不用提醒
          </button>
        </div>
      </div>
      <button
        type="button"
        className="remind-close"
        aria-label="今天不再提醒"
        onClick={() => {
          markSent(shown);
          setGone([...gone, shown.id]);
        }}
      >
        <X className="size-4" />
      </button>
    </section>
  );
}
