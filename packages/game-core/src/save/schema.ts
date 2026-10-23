import { seedFrom } from '../common/rng';

/** 改存档结构：本常量 +1，并在 migrations.ts 增加 vN→vN+1。 */
export const SAVE_SCHEMA_VERSION = 1;

export interface SaveFile {
  schemaVersion: number;
  configVersion: string;
  saveId: string;
  /** 云端修订号（乐观锁） */
  revision: number;
  /** 服务器时间（毫秒） */
  savedAt: number;
  /** 各模块存档段，键来自 module-catalog.json 的 save 字段 */
  modules: Record<string, unknown>;
  checksum: number;
}

/** 校验和只防误损坏，不当作防作弊。 */
export function computeChecksum(file: Omit<SaveFile, 'checksum'>): number {
  return seedFrom(JSON.stringify(file));
}

export function sealSave(file: Omit<SaveFile, 'checksum'>): SaveFile {
  return { ...file, checksum: computeChecksum(file) };
}

export function verifySave(file: SaveFile): boolean {
  const { checksum, ...rest } = file;
  return computeChecksum(rest) === checksum;
}
