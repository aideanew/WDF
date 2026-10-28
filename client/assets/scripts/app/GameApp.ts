/**
 * 本类**只做 onHide 注册**（切后台尽力保存的钩子）。真实启动链在 `BootController`：
 * compliance.check → account.login → 挂 MainView。
 *
 * ⚠ 原注释描绘的「7 步启动链」（platform → services → config → compliance → save(load) →
 * 离线结算(game-core) → 预下载 Bundle）**没有任何一行实现**。其中：
 * - 离线结算 / Bundle 预下载 / services/save.flush：均未实现，登记为缺口 M-2/S-4（见 plan-v010/02 §4）；
 * - 第 5 步 migrate：`packages/game-core/src/save/migrations.ts` 的 `migrate()` 全仓零调用点
 *   （ADR-0013 §7 裁决接受：服务端不管 sv、客户端单方负责而尚未接）。
 *   ★ 到期日：`SAVE_SCHEMA_VERSION` 从 1 变 2 那刻起必须接上；守护 tests/contract/save-schema-gate.test.mjs。
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
