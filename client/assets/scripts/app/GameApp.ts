/**
 * 依赖装配与启动顺序（唯一入口）：
 * 1 platform → 2 services(time/log/bus/storage/net) → 3 config(默认+热更覆盖) → 4 compliance 检查
 * → 5 save(load+migrate) → 6 离线结算(game-core) → 7 进入主场景，后台预下载 b-common/b-shallow
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
