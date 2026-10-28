import { getPlatform } from '../../platform';
import {
  SAVE_SCHEMA_VERSION,
  sealSave,
  verifySave,
  type SaveFile,
} from '../../generated/game-core/save';
import { CONFIG_VERSION } from '../../generated/game-core/generated/config-types';

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

/** 最近一次写入的存档（内存缓存，供切后台 flush 重新落盘）。 */
let lastSave: SaveFile | null = null;

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
      configVersion: CONFIG_VERSION,
      saveId: loadSaveId(),
      revision: 0,
      savedAt: Date.now(),
      modules: {},
    });
  },

  /** 写入；成功返回 true。必须剥离旧 checksum 再 seal，否则旧值混入校验和导致 load 永远失败。 */
  save(file: SaveFile): boolean {
    lastSave = file;
    return LocalSave.flush();
  },

  /**
   * 切后台尽力保存（TASK-7042 真实化）：把最近一次写入的存档重新落盘并刷新 savedAt。
   * 说明：各玩法动作已即时 save()，本方法只做"最后一次写入的重新持久化"，无独立待刷队列；
   * 本会话尚未写入过任何存档时返回 false（无可刷内容，诚实不假装成功）。
   */
  flush(): boolean {
    if (!lastSave) return false;
    const platform = getPlatform();
    const { checksum: _stale, ...body } = lastSave;
    const sealed = sealSave({ ...body, savedAt: Date.now(), schemaVersion: SAVE_SCHEMA_VERSION });
    return platform.storage.set(STORAGE_KEY, JSON.stringify(sealed));
  },
};
