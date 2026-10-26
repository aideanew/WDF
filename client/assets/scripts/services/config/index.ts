// 客户端配置读取服务：唯一读表入口（TASK-3100）。
// 引擎在 ./tables（不依赖 cc，可在 Node 下测）；本文件只做两件事：
// 把 Cocos 的 resources.load 注入进去，再把 API 原样转出。
import { resources, JsonAsset } from 'cc';
import { setLoader } from './tables';

export const SERVICE = 'config';

export type { TableName, TableRowMap, TableRow, PreloadResult } from './tables';
export { table, preload, configVersion, clearCache, setLoader } from './tables';

// ★ 这里曾用 `(await resources.load<JsonAsset>(path, JsonAsset)).json` —— 运行时崩溃 bug：
//   Cocos 3.8 的 resources.load 全部重载都返回 void（回调式），本仓也没有 loadAsync 声明。
//   `await void` 得到 undefined，再取 .json → TypeError → 所有读表全挂。
//   正解：用 4 参回调重载 `(path, type, onProgress, onComplete)` 手动包一层 Promise。
setLoader((path) =>
  new Promise<unknown>((resolve, reject) => {
    resources.load(path, JsonAsset, null, (err: Error | null, asset: JsonAsset) => {
      if (err || !asset) {
        reject(err ?? new Error(`[config] 加载失败: ${path}`));
        return;
      }
      resolve(asset.json);
    });
  }),
);
