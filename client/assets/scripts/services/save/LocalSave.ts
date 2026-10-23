import { getPlatform } from '../../platform';
import {
  SAVE_SCHEMA_VERSION,
  sealSave,
  verifySave,
  type SaveFile,
} from '../../generated/game-core/save';

const STORAGE_KEY = 'wdf.save.v1';
const SAVE_ID_KEY = 'wdf.saveId';

function uuid(): string {
  // 浏览器兼容的简化 uuid（足够做本地唯一标识）
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function loadSaveId(): string {
  const platform = getPlatform();
  const cached = platform.storage.get(SAVE_ID_KEY);
  if (cached) return cached;
  const id = uuid();
  platform.storage.set(SAVE_ID_KEY, id);
  return id;
}

/** 本地存档服务：写入时自动 seal，读取时自动 verify。 */
export const LocalSave = {
  getSaveId(): string { return loadSaveId(); },

  load(): SaveFile | null {
    const platform = getPlatform();
    const raw = platform.storage.get(STORAGE_KEY);
    if (!raw) return null;
    let parsed: SaveFile;
    try { parsed = JSON.parse(raw) as SaveFile; } catch { return null; }
    if (parsed.schemaVersion !== SAVE_SCHEMA_VERSION) return null;
    if (!verifySave(parsed)) return null;
    return parsed;
  },

  /** 构造新存档（首次启动）。 */
  init(): SaveFile {
    return sealSave({
      schemaVersion: SAVE_SCHEMA_VERSION,
      configVersion: '16921d30a67a934f',
      saveId: loadSaveId(),
      revision: 0,
      savedAt: Date.now(),
      modules: {},
    });
  },

  /** 写入；成功返回 true。 */
  save(file: SaveFile): boolean {
    const platform = getPlatform();
    const sealed = sealSave({ ...file, savedAt: Date.now(), schemaVersion: SAVE_SCHEMA_VERSION });
    return platform.storage.set(STORAGE_KEY, JSON.stringify(sealed));
  },
};
