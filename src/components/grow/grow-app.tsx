"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { Backpack, ClipboardList, GraduationCap, House } from "lucide-react";
import { Home } from "@/components/grow/home";
import { Learn } from "@/components/grow/learn";
import { Onboard, type BabyFields } from "@/components/grow/onboard";
import { PetsPage } from "@/components/grow/pets-page";
import { RecordsHeader, RecordsPage, type RecordView, recordTitle } from "@/components/grow/records-page";
import type { Metric } from "@/lib/grow/growth";
import { CARES, type CareId, type SeriesId, afterCare, viewPet } from "@/lib/grow/pets";
import { dropPhoto, putPhoto } from "@/lib/grow/media";
import type { RecordKind } from "@/lib/grow/records";
import {
  type BabyData,
  activePet,
  addBaby,
  addEvent,
  adopt,
  currentBaby,
  currentData,
  doneToday,
  editBaby,
  hydrated,
  newId,
  notHydrated,
  removeBaby,
  removeEvent,
  saveState,
  serverSnapshot,
  setData,
  snapshot,
  spendablePoints,
  subscribe,
  totalPoints,
} from "@/lib/grow/store";
import { dateKey } from "@/lib/grow/tasks";

type Tab = "home" | "pets" | "learn" | "records";

const TABS: { id: Tab; label: string; icon: typeof House }[] = [
  { id: "home", label: "首页", icon: House },
  { id: "pets", label: "宠物", icon: Backpack },
  { id: "learn", label: "早教", icon: GraduationCap },
  { id: "records", label: "记录", icon: ClipboardList },
];

const TITLES: Record<Tab, string> = { home: "首页", pets: "宠物", learn: "早教", records: "记录" };

export function GrowApp() {
  const state = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const ready = useSyncExternalStore(subscribe, hydrated, notHydrated);
  const [tab, setTab] = useState<Tab>("home");
  const [view, setView] = useState<RecordView>("hub");
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [previewSex, setPreviewSex] = useState<"boy" | "girl" | null>(null);

  const baby = currentBaby(state);
  const data = currentData(state);
  const themeSex = editing || adding ? (previewSex ?? baby?.sex) : (baby?.sex ?? previewSex);
  const theme = themeSex === "girl" ? "theme-girl" : "theme-boy";

  /** Every mutation goes through the current baby's slice; siblings never mix. */
  const update = useCallback((next: (prev: BabyData) => BabyData) => {
    const now = snapshot();
    const id = currentBaby(now)?.id;
    if (!id) return;
    saveState(setData(now, id, next(currentData(now))));
  }, []);

  const saveBaby = (fields: BabyFields) => {
    const now = snapshot();
    const id = currentBaby(now)?.id;
    saveState(editing && id ? editBaby(now, id, fields) : addBaby(now, fields));
    setPreviewSex(fields.sex);
    setEditing(false);
    setAdding(false);
  };

  const deleteBaby = () => {
    const now = snapshot();
    const id = currentBaby(now)?.id;
    if (!id) return;
    saveState(removeBaby(now, id));
    setEditing(false);
    setPreviewSex(null);
    setTab("home");
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

  /** One tap, one record. The id comes back so the undo has a target. */
  const logInstant = (kind: "poop" | "pee") => {
    const id = newId();
    update((prev) => ({ ...prev, events: [...prev.events, { id, kind, at: Date.now() }] }));
    return id;
  };

  const saveGrowth = (values: Partial<Record<Metric, number>>, date: string) =>
    update((prev) => addEvent(prev, { kind: "growth", at: new Date(`${date}T12:00:00`).getTime(), num: values }));

  const saveTemp = (temp: number, way: string, at: number) =>
    update((prev) => addEvent(prev, { kind: "temp", at, num: { temp }, pick: way }));

  const tagEvent = (id: string, tags: string[]) =>
    update((prev) => ({
      ...prev,
      events: prev.events.map((e) => (e.id === id ? { ...e, tags: tags.length ? tags : undefined } : e)),
    }));

  /** 12.4 — the bytes go too, not just the reference. */
  const deleteEvent = (id: string) => {
    const photo = currentData(snapshot()).events.find((e) => e.id === id)?.photo;
    if (photo) void dropPhoto(photo);
    update((prev) => removeEvent(prev, id));
  };

  const pickMeal = async (file: File) => {
    const key = newId();
    try {
      await putPhoto(key, file);
    } catch {
      return;
    }
    update((prev) => addEvent(prev, { kind: "meal", at: Date.now(), photo: key }));
  };

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

  const openRecord = (kind: RecordKind) => {
    setTab("records");
    setView(kind === "poop" || kind === "pee" ? "nappy" : kind === "growth" ? "growth" : kind);
  };

  if (!ready) {
    return (
      <main className={`g-page ${theme}`}>
        <div className="g-shell g-boot" aria-busy="true">
          <span className="g-boot-egg" />
          <p>正在把记录取出来…</p>
        </div>
      </main>
    );
  }

  if (!baby || adding) {
    return (
      <main className={`g-page ${theme}`}>
        <div className="g-shell">
          <Onboard
            onDone={saveBaby}
            onSexChange={setPreviewSex}
            onCancel={
              baby
                ? () => {
                    setAdding(false);
                    setPreviewSex(baby.sex);
                  }
                : undefined
            }
          />
        </div>
      </main>
    );
  }

  if (editing) {
    return (
      <main className={`g-page ${theme}`}>
        <div className="g-shell">
          <Onboard
            initial={baby}
            onDone={saveBaby}
            onSexChange={setPreviewSex}
            onDelete={deleteBaby}
            canDelete={state.babies.length > 1}
            onCancel={() => {
              setPreviewSex(baby.sex);
              setEditing(false);
            }}
          />
        </div>
      </main>
    );
  }

  const pet = activePet(data);
  const petView = pet ? viewPet(pet, totalPoints(data)) : null;

  return (
    <main className={`g-page ${theme}`}>
      <header className="g-topbar">
        <h1>{tab === "records" ? recordTitle(view) : TITLES[tab]}</h1>
        {tab === "records" && <RecordsHeader view={view} onBack={() => setView("hub")} />}
      </header>

      <div className="g-shell">
        {tab === "home" && petView && (
          <Home
            baby={baby}
            babies={state.babies}
            data={data}
            view={petView}
            care={data.care[petView.pet.id] ?? {}}
            onCare={doCare}
            onGo={setTab}
            onRecord={openRecord}
            onQuick={logInstant}
            onEditProfile={() => {
              setPreviewSex(baby.sex);
              setEditing(true);
            }}
            onAddBaby={() => {
              setPreviewSex(null);
              setAdding(true);
            }}
            onSwitchBaby={(id) => saveState({ ...snapshot(), current: id })}
          />
        )}
        {tab === "pets" && <PetsPage data={data} sex={baby.sex} onAdopt={takeIn} onSetActive={setActive} />}
        {tab === "learn" && <Learn baby={baby} data={data} onDo={doTask} onToggleMilestone={toggleMilestone} />}
        {tab === "records" && (
          <RecordsPage
            baby={baby}
            data={data}
            view={view}
            onView={setView}
            onInstant={logInstant}
            onUndo={deleteEvent}
            onSaveGrowth={saveGrowth}
            onSaveTemp={saveTemp}
            onTagEvent={tagEvent}
            onDeleteEvent={deleteEvent}
            onPickMeal={pickMeal}
            onToggleVaccine={toggleVaccine}
          />
        )}
      </div>

      <nav className="g-tabs" aria-label="主导航">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTab(t.id);
                if (t.id === "records") setView("hub");
              }}
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
