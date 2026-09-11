"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { CalendarCheck, HeartPulse, Sparkles } from "lucide-react";
import { Health } from "@/components/grow/health";
import { Onboard } from "@/components/grow/onboard";
import { Plan } from "@/components/grow/plan";
import { Today } from "@/components/grow/today";
import {
  type GrowState,
  type Measure,
  type Profile,
  hydrated,
  newId,
  notHydrated,
  saveState,
  serverSnapshot,
  snapshot,
  subscribe,
} from "@/lib/grow/store";
import { dateKey } from "@/lib/grow/tasks";

type Tab = "today" | "plan" | "health";

const TABS: { id: Tab; label: string; icon: typeof Sparkles }[] = [
  { id: "today", label: "今天", icon: Sparkles },
  { id: "plan", label: "计划", icon: CalendarCheck },
  { id: "health", label: "健康", icon: HeartPulse },
];

export function GrowApp() {
  const state = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const ready = useSyncExternalStore(subscribe, hydrated, notHydrated);
  const [tab, setTab] = useState<Tab>("today");

  const update = useCallback((next: (prev: GrowState) => GrowState) => {
    saveState(next(snapshot()));
  }, []);

  const start = (profile: Profile) => update((prev) => ({ ...prev, profile }));

  const completeToday = () =>
    update((prev) => {
      const today = dateKey();
      if (prev.doneDays.includes(today)) return prev;
      return { ...prev, doneDays: [...prev.doneDays, today] };
    });

  const toggleMilestone = (id: string) =>
    update((prev) => ({
      ...prev,
      milestones: prev.milestones.includes(id)
        ? prev.milestones.filter((m) => m !== id)
        : [...prev.milestones, id],
    }));

  const toggleVaccine = (id: string) =>
    update((prev) => ({
      ...prev,
      vaccines: prev.vaccines.includes(id) ? prev.vaccines.filter((v) => v !== id) : [...prev.vaccines, id],
    }));

  const addMeasure = (m: Omit<Measure, "id">) =>
    update((prev) => ({ ...prev, measures: [...prev.measures, { ...m, id: newId() }] }));

  if (!ready) {
    return (
      <main className="grow-page">
        <div className="grow-shell grow-boot" aria-busy="true">
          <span className="grow-boot-egg" />
          <p>正在把记录取出来…</p>
        </div>
      </main>
    );
  }

  if (!state.profile) return <Onboard onDone={start} />;

  return (
    <main className="grow-page">
      <div className="grow-shell">
        {tab === "today" && (
          <Today
            state={state}
            onComplete={completeToday}
            onGoPlan={() => setTab("plan")}
            onGoHealth={() => setTab("health")}
          />
        )}
        {tab === "plan" && <Plan state={state} onToggleMilestone={toggleMilestone} />}
        {tab === "health" && <Health state={state} onAdd={addMeasure} onToggleVaccine={toggleVaccine} />}

        <nav className="grow-tabs" aria-label="主导航">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={tab === t.id ? "on" : ""}
                aria-current={tab === t.id ? "page" : undefined}
              >
                <Icon className="size-5" />
                {t.label}
              </button>
            );
          })}
        </nav>
      </div>
    </main>
  );
}
