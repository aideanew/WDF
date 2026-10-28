/**
 * 云存档同步 · 用例与状态（TASK-3105，不依赖 cc）。
 *
 * 服务端语义（`server/src/modules/save/service.ts`，只读核对）：
 *  - `save.pull` → `{ summary, snapshot }`；**snapshot 就是完整存档体**（S-09.2 阻塞点已核：可整档替换）；
 *  - `save.push` → `{ accepted:true, revision }` 或 `{ accepted:false, conflict }`（**不报错**）；
 *  - `save.resolveFork` → `{ revision }`；keep='cloud' 无副作用，keep='local' 需带 localSnapshot。
 *
 * 铁律：
 *  - **冲突的唯一权威是 `conflictOf()`**（契约 §铁律 1），即 `accepted:false`。
 *    本类暴露的 `forkRisk` 只是"两边 revision 不等"的**预告**，用于弹窗前提示，不作冲突判定。
 *  - **`3001 DUPLICATE_REQUEST` 是成功**（幂等回放），经 `toUxState` 得 `success`，绝不进冲突分支。
 *  - 写入本地一律**剥离旧 checksum 再 seal**（C-05 用例 2 证明不剥离必坏）。
 */
import { invoke, type RpcError } from '../../../services/net/RpcClient';
import { ERR } from '../../../generated/contracts/common/errors';
import { toUxState, conflictOf, type UxView } from '../../../generated/contracts/common/ux';
import type {
  ResolveForkReq,
  SavePushReq,
  SavePushRes,
  SavePullRes,
  SaveSummary,
} from '../../../generated/contracts/save/index';
import { LocalSave } from '../../../services/save/LocalSave';
import {
  SAVE_SCHEMA_VERSION,
  sealSave,
  verifySave,
  type SaveFile,
} from '../../../generated/game-core/save/index';

const UNKNOWN: UxView = { state: 'error', code: ERR.INTERNAL, retryable: true, next: 'retry' };

export type KeepChoice = 'local' | 'cloud';

export interface SyncStatus {
  /** 本地存档修订号；无本地档为 -1 */
  localRevision: number;
  /** 云端修订号；云端无档为 0 */
  cloudRevision: number;
  /** 云端存档时间（ms）；无档为 0 */
  cloudSavedAt: number;
  /** 云端玩家等级（summary 提供）；未知为 1 */
  cloudLevel: number;
  /** 双方都有档且 revision 不等 —— 仅是**预告**，冲突权威见 `conflictOf()` */
  forkRisk: boolean;
  /** 本次 pull 是否拿到了完整快照（决定能否执行 keep='cloud'） */
  cloudHasSnapshot: boolean;
  /** `save.pull` 是否成功 */
  checked: boolean;
  /** 界面态 */
  ux: UxView;
}

export class SaveSyncModel {
  private version = 0;
  private _status: SyncStatus = {
    localRevision: -1,
    cloudRevision: 0,
    cloudSavedAt: 0,
    cloudLevel: 1,
    forkRisk: false,
    cloudHasSnapshot: false,
    checked: false,
    ux: UNKNOWN,
  };
  private _conflict: SaveSummary | null = null;
  private _cloudSnapshot: SaveFile | null = null;
  private _loading = false;

  get stateVersion(): number { return this.version; }
  /** 最近一次 `status()` 的结果（初始为未检查态）。 */
  get lastStatus(): SyncStatus { return this._status; }
  /** 最近一次 push 返回的冲突摘要（`accepted:false` 才有值） */
  get conflict(): SaveSummary | null { return this._conflict; }
  get loading(): boolean { return this._loading; }

  protected touch(): void { this.version++; }

  /** 读本地 + 拉云端，产出可展示状态。失败不清空旧状态，只换界面态。 */
  async status(): Promise<SyncStatus> {
    this._loading = true;
    try {
      const local = LocalSave.load();
      const res = await invoke<unknown, SavePullRes>('save.pull', undefined);
      const summary = res?.summary ?? null;
      const snapshot = isSaveFile(res?.snapshot) ? (res.snapshot as SaveFile) : null;

      this._cloudSnapshot = snapshot;
      this._status = {
        localRevision: local ? local.revision : -1,
        cloudRevision: summary ? summary.revision : 0,
        cloudSavedAt: summary ? summary.savedAt : 0,
        cloudLevel: summary ? summary.level : 1,
        forkRisk: local !== null && summary !== null && local.revision !== summary.revision,
        cloudHasSnapshot: snapshot !== null,
        checked: true,
        ux: { state: 'success', code: 0, retryable: false },
      };
    } catch (e) {
      this._status = { ...this._status, checked: false, ux: uxOf(e) };
    } finally {
      this._loading = false;
      this.touch();
    }
    return this._status;
  }

  /**
   * 推送本地档。`accepted:true` → 对齐本地 revision 并返回 `success`；
   * `accepted:false` → 记冲突摘要并返回 `conflict`（不抛、不当错误处理）。
   */
  async push(): Promise<UxView> {
    const local = LocalSave.load();
    if (!local) return { state: 'empty', retryable: false };

    this._loading = true;
    try {
      const res = await invoke<SavePushReq, SavePushRes>('save.push', {
        baseRevision: local.revision,
        snapshot: local,
        checksum: local.checksum,
      });
      if (conflictOf(res)) {
        // `SavePushRes` 是联合类型，`conflictOf` 不是类型守卫；先判定再用 `accepted === false` 收窄
        const conflict = res.accepted === false ? res.conflict : null;
        this._conflict = conflict;
        this.touch();
        return { state: 'conflict', retryable: false };
      }
      // 成功：把本地 revision 对齐到云端返回值，避免下次 pull 又显示不等
      if (res.accepted === true && res.revision !== local.revision) alignLocalRevision(res.revision);
      this._conflict = null;
      this.touch();
      return { state: 'success', code: 0, retryable: false };
    } catch (e) {
      const ux = uxOf(e);
      this.touch();
      return ux;
    } finally {
      this._loading = false;
    }
  }

  /**
   * 分叉裁决。
   *  - `'cloud'`：服务端无副作用，客户端随后**整档替换**本地（S-09.6），并校验 `verifySave`；
   *  - `'local'`：带 `localSnapshot` 覆盖云端，然后把本地 revision 对齐到返回值。
   */
  async resolve(keep: KeepChoice): Promise<UxView> {
    this._loading = true;
    try {
      if (keep === 'local') {
        const local = LocalSave.load();
        if (!local) return { state: 'empty', retryable: false };
        const res = await invoke<ResolveForkReq, { revision: number }>('save.resolveFork', {
          keep: 'local',
          localSnapshot: local,
        });
        const rev = typeof res?.revision === 'number' ? res.revision : local.revision;
        if (rev !== local.revision) alignLocalRevision(rev);
        this._conflict = null;
        this.touch();
        return { state: 'success', code: 0, retryable: false };
      }

      // keep='cloud'：先落裁决（记录玩家选择），再整档替换本地
      const res = await invoke<ResolveForkReq, { revision: number }>('save.resolveFork', {
        keep: 'cloud',
      });
      const rev = typeof res?.revision === 'number' ? res.revision : this._status.cloudRevision;

      if (!this._cloudSnapshot) {
        // 理论上 status() 已拉过；兜底再拉一次，绝不本地"拼"存档
        const pulled = await invoke<unknown, SavePullRes>('save.pull', undefined);
        this._cloudSnapshot = isSaveFile(pulled?.snapshot) ? (pulled.snapshot as SaveFile) : null;
      }
      const cloud = this._cloudSnapshot;
      if (!cloud) {
        this.touch();
        return { state: 'empty', retryable: false };
      }

      // ⚠ 这里**直接报错、不走 game-core 的 migrate()** 是 ADR-0013 §7 裁决保留的行为（G-2），不是疏漏。
      // 裁决：云档版本比本地旧 → 保持报错，不迁移、不替换本地档。
      // ★ 到期日：`SAVE_SCHEMA_VERSION` 从 1 变成 2 那一刻起，这条会变成「换设备玩家载入失败」。
      //   改版本常量前必须先重开 ADR-0013 §7。守护：tests/contract/save-schema-gate.test.mjs。
      if (cloud.schemaVersion !== SAVE_SCHEMA_VERSION) {
        console.warn(`[save] 云端 schemaVersion=${cloud.schemaVersion} 与本地 ${SAVE_SCHEMA_VERSION} 不符，未替换本地档`);
        this.touch();
        return { state: 'error', code: ERR.BAD_PAYLOAD, retryable: false };
      }

      // 整档替换：剥离旧 checksum 再 seal（云端 body 里的 checksum 可能已是 0）
      const { checksum: _stale, ...body } = cloud;
      const sealed = sealSave({ ...body, revision: rev });
      if (!verifySave(sealed)) {
        console.warn('[save] 云端快照重封印后 verifySave 失败，未写入本地');
        this.touch();
        return { state: 'error', code: ERR.BAD_PAYLOAD, retryable: false };
      }
      LocalSave.save(sealed);
      this._conflict = null;
      this.touch();
      return { state: 'success', code: 0, retryable: false };
    } catch (e) {
      const ux = uxOf(e);
      this.touch();
      return ux;
    } finally {
      this._loading = false;
    }
  }

  /** 手动清状态（登出时）。 */
  clear(): void {
    this._conflict = null;
    this._cloudSnapshot = null;
    this.touch();
  }
}

/** 把 RpcError 折成界面态。`RpcClient` 网络不可达时用本地合成码 `NET_CODE_OFFLINE = -1`（FIX-6/R-3，W2-2）；code 恒为 number，typeof 守卫仅防御契约漂移。 */
function uxOf(e: unknown): UxView {
  const code = typeof (e as RpcError | null)?.code === 'number' ? (e as RpcError).code : ERR.INTERNAL;
  return toUxState(code);
}

/** 结构上像 SaveFile 就算（服务端存的是客户端当年推上去的整档）。 */
function isSaveFile(v: unknown): v is SaveFile {
  return typeof v === 'object' && v !== null && 'schemaVersion' in v && 'modules' in v;
}

/** 对齐本地修订号：剥离旧 checksum → 改 revision → 重新 seal → 写回。 */
function alignLocalRevision(newRevision: number): void {
  const local = LocalSave.load();
  if (!local) return;
  const { checksum: _stale, ...body } = local;
  LocalSave.save(sealSave({ ...body, revision: newRevision }));
}
