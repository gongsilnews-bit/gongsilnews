/* 장면 이미지 원본은 IndexedDB에 보관하고 chrome.storage에는 메타데이터만 둔다. */
const GYWMediaStore = (() => {
  const DB_NAME = "gongsil-youtube-writer";
  const DB_VERSION = 1;
  const STORE = "media";
  const objectUrls = new Map();

  function open() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("이미지 저장소를 열지 못했습니다."));
    });
  }

  async function transact(mode, work) {
    const db = await open();
    try {
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const store = tx.objectStore(STORE);
        let value;
        try {
          value = work(store);
        } catch (error) {
          reject(error);
          return;
        }
        tx.oncomplete = () => resolve(value);
        tx.onerror = () => reject(tx.error || new Error("이미지 저장에 실패했습니다."));
        tx.onabort = () => reject(tx.error || new Error("이미지 저장이 취소되었습니다."));
      });
    } finally {
      db.close();
    }
  }

  async function put(blob, meta = {}) {
    const id = meta.id || gywUid("media");
    await transact("readwrite", (store) => store.put({
      id,
      blob,
      name: meta.name || "image",
      mime: blob?.type || meta.mime || "image/webp",
      source: meta.source || "uploaded",
      createdAt: meta.createdAt || Date.now(),
    }));
    return id;
  }

  async function get(id) {
    if (!id) return null;
    const db = await open();
    try {
      return await new Promise((resolve, reject) => {
        const request = db.transaction(STORE, "readonly").objectStore(STORE).get(id);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    } finally {
      db.close();
    }
  }

  async function url(id) {
    if (!id) return "";
    if (objectUrls.has(id)) return objectUrls.get(id);
    const record = await get(id);
    if (!record?.blob) return "";
    const value = URL.createObjectURL(record.blob);
    objectUrls.set(id, value);
    return value;
  }

  async function remove(id) {
    if (!id) return;
    const existing = objectUrls.get(id);
    if (existing) URL.revokeObjectURL(existing);
    objectUrls.delete(id);
    await transact("readwrite", (store) => store.delete(id));
  }

  async function clear() {
    for (const value of objectUrls.values()) URL.revokeObjectURL(value);
    objectUrls.clear();
    await transact("readwrite", (store) => store.clear());
  }

  return { put, get, url, remove, clear };
})();

