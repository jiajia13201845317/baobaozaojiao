"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { Backpack, GraduationCap, HeartPulse, House } from "lucide-react";
import { Health } from "@/components/grow/health";
import { Home } from "@/components/grow/home";
import { Learn } from "@/components/grow/learn";
import { Onboard } from "@/components/grow/onboard";
import { PetsPage } from "@/components/grow/pets-page";
import { CARES, type CareId, type SeriesId, afterCare, viewPet } from "@/lib/grow/pets";
import {
  type GrowState,
  type Measure,
  type Profile,
  activePet,
  adopt,
  doneToday,
  hydrated,
  newId,
  notHydrated,
  saveState,
  serverSnapshot,
  snapshot,
  spendablePoints,
  subscribe,
  totalPoints,
  withFirstEgg,
} from "@/lib/grow/store";
import { dateKey } from "@/lib/grow/tasks";

type Tab = "home" | "pets" | "learn" | "health";

const TABS: { id: Tab; label: string; icon: typeof House }[] = [
  { id: "home", label: "首页", icon: House },
  { id: "pets", label: "宠物", icon: Backpack },
  { id: "learn", label: "早教", icon: GraduationCap },
  { id: "health", label: "健康", icon: HeartPulse },
];

const TITLES: Record<Tab, string> = { home: "首页", pets: "宠物", learn: "早教", health: "健康" };

export function GrowApp() {
  const state = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const ready = useSyncExternalStore(subscribe, hydrated, notHydrated);
  const [tab, setTab] = useState<Tab>("home");
  const [editing, setEditing] = useState(false);

  const update = useCallback((next: (prev: GrowState) => GrowState) => {
    saveState(next(snapshot()));
  }, []);

  const start = (profile: Profile) => {
    update((prev) => withFirstEgg({ ...prev, profile }));
    setEditing(false);
  };

  const doTask = (taskId: string) =>
    update((prev) => {
      const today = dateKey();
      const ids = doneToday(prev, today);
      const next = ids.includes(taskId) ? ids.filter((id) => id !== taskId) : [...ids, taskId];
      const done = { ...prev.done };
      if (next.length) done[today] = next;
      else delete done[today];
      return { ...prev, done };
    });

  const toggleMilestone = (id: string) =>
    update((prev) => ({
      ...prev,
      milestones: prev.milestones.includes(id) ? prev.milestones.filter((m) => m !== id) : [...prev.milestones, id],
    }));

  const toggleVaccine = (id: string) =>
    update((prev) => ({
      ...prev,
      vaccines: prev.vaccines.includes(id) ? prev.vaccines.filter((v) => v !== id) : [...prev.vaccines, id],
    }));

  const addMeasure = (m: Omit<Measure, "id">) =>
    update((prev) => ({ ...prev, measures: [...prev.measures, { ...m, id: newId() }] }));

  const doCare = (careId: CareId) =>
    update((prev) => {
      const pet = activePet(prev);
      const cost = CARES.find((c) => c.id === careId)?.cost ?? 0;
      if (!pet || spendablePoints(prev) < cost) return prev;
      return {
        ...prev,
        care: { ...prev.care, [pet.id]: afterCare(prev.care[pet.id] ?? {}, careId) },
        spent: prev.spent + cost,
      };
    });

  const takeIn = (series: SeriesId, cost: number) =>
    update((prev) => (spendablePoints(prev) < cost ? prev : adopt(prev, series, cost)));

  const setActive = (id: string) => update((prev) => ({ ...prev, active: id }));

  if (!ready) {
    return (
      <main className="g-page">
        <div className="g-shell g-boot" aria-busy="true">
          <span className="g-boot-egg" />
          <p>正在把记录取出来…</p>
        </div>
      </main>
    );
  }

  if (!state.profile) {
    return (
      <main className="g-page">
        <div className="g-shell">
          <Onboard onDone={start} />
        </div>
      </main>
    );
  }

  if (editing) {
    return (
      <main className="g-page">
        <div className="g-shell">
          <Onboard initial={state.profile} onDone={start} onCancel={() => setEditing(false)} />
        </div>
      </main>
    );
  }

  const pet = activePet(state);
  const view = pet ? viewPet(pet, totalPoints(state)) : null;

  return (
    <main className="g-page">
      <header className="g-topbar">
        <h1>{TITLES[tab]}</h1>
      </header>

      <div className="g-shell">
        {tab === "home" && view && (
          <Home
            state={state}
            view={view}
            care={state.care[view.pet.id] ?? {}}
            onCare={doCare}
            onGo={setTab}
            onEditProfile={() => setEditing(true)}
          />
        )}
        {tab === "pets" && <PetsPage state={state} onAdopt={takeIn} onSetActive={setActive} />}
        {tab === "learn" && <Learn state={state} onDo={doTask} onToggleMilestone={toggleMilestone} />}
        {tab === "health" && <Health state={state} onAdd={addMeasure} onToggleVaccine={toggleVaccine} />}
      </div>

      <nav className="g-tabs" aria-label="主导航">
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
    </main>
  );
}
