"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { ChevronLeft, ClipboardList, GraduationCap, House, Music4, UserRound } from "lucide-react";
import { Home } from "@/components/grow/home";
import { Learn } from "@/components/grow/learn";
import { Onboard, type BabyFields } from "@/components/grow/onboard";
import { PetsPage } from "@/components/grow/pets-page";
import { ToyApp } from "@/components/toy-app";
import { RecordsHeader, RecordsPage, type RecordView, recordTitle } from "@/components/grow/records-page";
import { ConsentGate } from "@/components/grow/consent-gate";
import { KidLockBar, KidLockSetup } from "@/components/grow/kid-lock";
import { ME_TITLES, MeHeader, MePage, type MeView } from "@/components/grow/me-page";
import { ReminderCard } from "@/components/grow/reminder-card";
import type { Metric } from "@/lib/grow/growth";
import { CARES, type CareId, type SeriesId, afterCare, viewPet } from "@/lib/grow/pets";
import { dropPhoto, dropAllPhotos, putPhoto } from "@/lib/grow/media";
import type { ConsentKey } from "@/lib/grow/settings";
import type { MealId, RecordKind } from "@/lib/grow/records";
import {
  type BabyData,
  type GrowState,
  activePet,
  addCarer,
  editCarer,
  note,
  patchSettings,
  removeCarer,
  setConsent,
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
  EMPTY,
  saveState,
  serverSnapshot,
  setData,
  snapshot,
  spendablePoints,
  subscribe,
  totalPoints,
} from "@/lib/grow/store";
import { dateKey } from "@/lib/grow/tasks";

type Tab = "home" | "pets" | "learn" | "listen" | "records" | "me";

/**
 * 宠物 is reached from the home pet card rather than the bar: five tabs is
 * already the most a thumb can hit reliably on a phone, and 听听 earned its
 * slot by being the one screen a child uses directly.
 */
const TABS: { id: Tab; label: string; icon: typeof House }[] = [
  { id: "home", label: "首页", icon: House },
  { id: "learn", label: "早教", icon: GraduationCap },
  { id: "listen", label: "听听", icon: Music4 },
  { id: "records", label: "记录", icon: ClipboardList },
  { id: "me", label: "我的", icon: UserRound },
];

const TITLES: Record<Tab, string> = {
  home: "首页",
  pets: "宠物图鉴",
  learn: "早教",
  listen: "宝宝听听",
  records: "记录",
  me: "我的",
};

export function GrowApp() {
  const state = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const ready = useSyncExternalStore(subscribe, hydrated, notHydrated);
  const [tab, setTab] = useState<Tab>("home");
  /**
   * Once 听听 has been opened it stays mounted so a song survives a trip to
   * 记录. Losing playback because a parent logged a nappy would be its own bug.
   */
  const [listenMounted, setListenMounted] = useState(false);
  const [view, setView] = useState<RecordView>("hub");
  const [meView, setMeView] = useState<MeView>("hub");
  const [kidSetup, setKidSetup] = useState(false);
  const [kidMode, setKidMode] = useState(false);
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

  /** Household-level writes. Unlike `update`, these are not scoped to a baby. */
  const house = useCallback((next: (prev: GrowState) => GrowState) => {
    saveState(next(snapshot()));
  }, []);

  const consentOf = (key: ConsentKey, on: boolean) =>
    house((prev) => note(setConsent(prev, key, on), `${on ? "打开" : "关闭"}了「${key === "photos" ? "照片记录" : key === "personalized" ? "分龄内容" : key === "notify" ? "提醒" : "基础记录"}」`));

  /**
   * 7.3 — 全部删掉 means gone, including the photo bytes in IndexedDB and the
   * two listening-app keys, which do not live under the same state blob.
   */
  const wipeAll = () => {
    void dropAllPhotos();
    try {
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith("grow-") || key.startsWith("bao-")) localStorage.removeItem(key);
      }
    } catch {
      /* blocked storage — the in-memory reset below still applies */
    }
    saveState(EMPTY);
    setTab("home");
    setMeView("hub");
    setPreviewSex(null);
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

  const logMeal = (meal: MealId) =>
    update((prev) => addEvent(prev, { kind: "meal", at: Date.now(), pick: meal, by: state.by ?? undefined }));

  const pickMeal = async (meal: MealId, file: File) => {
    const key = newId();
    try {
      await putPhoto(key, file);
    } catch {
      return;
    }
    update((prev) => addEvent(prev, { kind: "meal", at: Date.now(), pick: meal, photo: key, by: state.by ?? undefined }));
  };

  /** 4.5 — two taps, no arithmetic. `napsOf` pairs them back into naps. */
  const logSleep = (which: "down" | "up") =>
    update((prev) => addEvent(prev, { kind: "sleep", at: Date.now(), pick: which, by: state.by ?? undefined }));

  const logFeed = (what: string) =>
    update((prev) => addEvent(prev, { kind: "feed", at: Date.now(), pick: what, by: state.by ?? undefined }));

  /** 4.6 — the reference id goes in `pick`, its wording in `note`, so a later
   * change to the reference text never rewrites what a parent recorded. */
  const logMotor = (refId: string, what: string) =>
    update((prev) => addEvent(prev, { kind: "motor", at: Date.now(), pick: refId, note: what, by: state.by ?? undefined }));

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
    setView(kind === "poop" || kind === "pee" ? "nappy" : kind === "feed" ? "sleep" : kind);
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

  /**
   * 7.1 — consent comes before the first档案, not after. Asking afterwards
   * would mean the app had already written a child's data to make the point.
   */
  if (!state.settings.consent.basic) {
    return (
      <main className={`g-page ${theme}`}>
        <div className="g-shell">
          <ConsentGate
            onDone={(picked) =>
              house((prev) =>
                note(
                  patchSettings(prev, {
                    consent: { ...picked, guardianAt: Date.now() },
                  }),
                  "确认了监护人身份与分项同意",
                ),
              )
            }
          />
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
  const full = state.settings.mode === "full";

  /** 7.5 — nothing but playback is on screen, so nothing but playback is reachable. */
  if (kidMode) {
    return (
      <main className={`g-page ${theme} is-kid`}>
        <KidLockBar pin={state.settings.lockPin} onExit={() => setKidMode(false)} />
        <div className="g-shell g-shell-wide">
          <div className="listen-tab">
            <ToyApp embedded />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={`g-page ${theme}`}>
      {tab !== "listen" && (
        <header className="g-topbar">
          <h1>{tab === "records" ? recordTitle(view) : tab === "me" ? ME_TITLES[meView] : TITLES[tab]}</h1>
          {tab === "records" && <RecordsHeader view={view} onBack={() => setView("hub")} />}
          {tab === "me" && <MeHeader view={meView} onBack={() => setMeView("hub")} />}
          {tab === "pets" && (
            <button type="button" className="g-back" onClick={() => setTab("home")}>
              <ChevronLeft className="size-5" />
              首页
            </button>
          )}
        </header>
      )}

      <div className={`g-shell${tab === "listen" ? " g-shell-wide" : ""}`}>
        {tab === "home" && (
          <ReminderCard
            baby={baby}
            data={data}
            settings={state.settings}
            onGo={(where) => {
              setTab(where);
              if (where === "records") setView("hub");
            }}
          />
        )}
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
        {tab === "learn" && (
          <Learn
            baby={baby}
            data={data}
            onDo={doTask}
            onToggleMilestone={toggleMilestone}
            bilingual={state.settings.bilingual}
          />
        )}
        {listenMounted && (
          <div className={`listen-tab${tab === "listen" ? "" : " is-off"}`}>
            <ToyApp embedded />
          </div>
        )}
        {tab === "me" && (
          <MePage
            state={state}
            baby={baby}
            data={data}
            view={meView}
            onView={setMeView}
            actions={{
              onConsent: consentOf,
              onBilingual: (on) => house((prev) => patchSettings(prev, { bilingual: on })),
              onMode: (mode) =>
                house((prev) => note(patchSettings(prev, { mode }), `切换到${mode === "full" ? "完整版" : "纯记录版"}`)),
              onTempReminder: (on, every) => house((prev) => patchSettings(prev, { tempReminder: { on, every } })),
              onAddCarer: (name, role) => house((prev) => note(addCarer(prev, name, role), "加了成员", name)),
              onEditCarer: (id, patch) => house((prev) => note(editCarer(prev, id, patch), "改了成员权限")),
              onRemoveCarer: (id) => house((prev) => note(removeCarer(prev, id), "删掉了成员")),
              onSetBy: (id) => house((prev) => ({ ...prev, by: id })),
              onSetPin: (pin) => house((prev) => patchSettings(prev, { lockPin: pin })),
              onKidMode: () => setKidSetup(true),
              onWipe: wipeAll,
              onEditProfile: () => {
                setPreviewSex(baby.sex);
                setEditing(true);
              },
              onAddBaby: () => {
                setPreviewSex(null);
                setAdding(true);
              },
            }}
          />
        )}
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
            onLogMeal={logMeal}
            onSleep={logSleep}
            onFeed={logFeed}
            onMotor={logMotor}
            onToggleVaccine={toggleVaccine}
            photosOn={state.settings.consent.photos}
          />
        )}
      </div>

      {kidSetup && (
        <KidLockSetup
          pin={state.settings.lockPin}
          onCancel={() => setKidSetup(false)}
          onSetPin={(pin) => house((prev) => patchSettings(prev, { lockPin: pin }))}
          onStart={() => {
            setKidSetup(false);
            setKidMode(true);
          }}
        />
      )}

      <nav className="g-tabs" aria-label="主导航">
        {TABS.filter((t) => full || t.id === "home" || t.id === "records" || t.id === "me").map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTab(t.id);
                if (t.id === "records") setView("hub");
                if (t.id === "listen") setListenMounted(true);
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
