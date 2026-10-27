/**
 * 依赖装配与启动顺序（唯一入口）：
 * 1 platform → 2 services(time/log/bus/storage/net) → 3 config(默认+热更覆盖) → 4 compliance 检查
 * → 5 save(load) → 6 离线结算(game-core) → 7 进入主场景，后台预下载 b-common/b-shallow
 *
 * ⚠ 第 5 步**没有 migrate**（原名写的是 load+migrate，属空头承诺，已按实际改写）。
 *   `packages/game-core/src/save/migrations.ts` 的 `migrate()` 目前**全仓零调用点**，
 *   这是 ADR-0013 §7 裁决接受的后果（G-1）：服务端不管 sv、客户端单方负责，而客户端尚未接。
 *   ★ 到期日：`SAVE_SCHEMA_VERSION` 从 1 变成 2 那一刻起必须接上。
 *   守护：tests/contract/save-schema-gate.test.mjs。
 */
import { getPlatform } from '../platform';

export class GameApp {
  private static started = false;

  static async start(): Promise<void> {
    if (GameApp.started) return;
    GameApp.started = true;
    const platform = getPlatform();
    platform.lifecycle.onHide(() => {
      // 切后台尽力保存：services/save.flush()
    });
  }
}
