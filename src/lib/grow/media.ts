/**
 * Local photo store (plan 12.4).
 *
 * Photos never go into localStorage. A few meal snaps would blow the ~5MB
 * quota and take the growth records down with them, so images live in
 * IndexedDB and the record only keeps a key.
 *
 * Two sizes are written, as the plan asks: a thumbnail for lists and
 * timelines, and one downscaled "original" for the detail view. There is no
 * true original — a 12MP phone photo is stripped to at most 1280px on load,
 * because the app is a diary, not a photo library, and 11.5 flags storage
 * cost as a real line item.
 *
 * 7.2 / 12.4: deleting a record deletes the bytes, not just the reference.
 * Nothing here reads image content; there is no recognition of any kind.
 */
const DB = "grow-media";
const STORE = "photos";
const FULL_MAX = 1280;
const THUMB_MAX = 320;

export type Photo = { id: string; full: Blob; thumb: Blob; at: number };

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = fn(tx.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        tx.oncomplete = () => db.close();
      }),
  );
}

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("坏掉的图片"));
    };
    img.src = url;
  });
}

function scale(img: HTMLImageElement, max: number): Promise<Blob> {
  const ratio = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * ratio));
  const h = Math.max(1, Math.round(img.naturalHeight * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("存不下这张图"))), "image/jpeg", 0.82);
  });
}

export async function putPhoto(id: string, file: Blob) {
  const img = await loadImage(file);
  const [full, thumb] = await Promise.all([scale(img, FULL_MAX), scale(img, THUMB_MAX)]);
  await run("readwrite", (store) => store.put({ id, full, thumb, at: Date.now() } satisfies Photo));
}

export async function getPhoto(id: string, size: "full" | "thumb" = "thumb") {
  const row = await run<Photo | undefined>("readonly", (store) => store.get(id));
  return row ? row[size] : null;
}

/** A real delete, so "监护人可删除" is true rather than merely displayed. */
export async function dropPhoto(id: string) {
  await run("readwrite", (store) => store.delete(id));
}

export async function photoIds() {
  const keys = await run<IDBValidKey[]>("readonly", (store) => store.getAllKeys());
  return keys.map(String);
}

/** Bytes still held, so the parent can see what the app is keeping. */
export async function photoBytes() {
  const all = await run<Photo[]>("readonly", (store) => store.getAll());
  return all.reduce((sum, p) => sum + p.full.size + p.thumb.size, 0);
}

/**
 * 7.3 删除范围 — the photo store is the part a state wipe would miss, since
 * the bytes never lived in localStorage. Clearing the whole object store is
 * the only way "全部删掉" can be honest.
 */
export async function dropAllPhotos() {
  await run("readwrite", (store) => store.clear());
}
