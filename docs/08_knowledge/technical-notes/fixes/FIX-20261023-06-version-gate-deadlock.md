---
id: KB-FIX-20261023-06
title: 客户端版本闸把 config.manifest 自己也拦了，导致旧客户端永久无法更新
status: active
date: 2026-10-23
kind: bug
severity: P1
module: config
owner: hark
related: [TASK-0105, MUST-09]
---

# 版本闸把 `config.manifest` 自己也拦了（自锁死）

## 1. 现象

`TASK-0105` 要求"版本闸在 `rpc.ts` 统一拦截，不只在这两个动作里"，我按字面实现成了**对所有动作生效**。集成测试随即红：

```text
✖ AT-0105 config.manifest 与版本闸
  TypeError: Cannot read properties of undefined (reading 'configVersion')
      at tests/integration/auth.test.mjs:184:24
```

第 184 行是"登记一条 minClient=v9.0.0 的发布记录后，再取一次 manifest"，此时返回里已经没有 `d` —— 因为 `handleRpc` 直接回了 `{c: 9001, msg: 'client too old'}`，`d` 不存在。

## 2. 影响

这是典型的**引导期自锁（bootstrap deadlock）**：

- 客户端启动第一步调 `config.manifest`，目的是拿到"新的 configVersion、热更包地址、**最低客户端版本**"。
- 如果 `config.manifest` 本身被版本闸拦住，客户端就只能拿到一句"你太旧了"，**永远拿不到该升到哪个版本、包从哪下**。
- 结果：一旦把 `min_client` 抬高，所有旧客户端**永久卡死**，没有自救路径。这比"少拦几个动作"严重得多——属于把人锁在门外还把钥匙锁在屋里。

## 3. 根因

`server/src/gateway/rpc.ts` 里版本闸写在了**动作分发之前且无豁免**：

```ts
const minClient = await activeMinClient();
if (minClient && isOlderThan(req.m?.cv, minClient)) {
  return { c: ERR.CLIENT_TOO_OLD, msg: `client too old: ${req.m?.cv} < ${minClient}`, t };
}
```

`config.manifest` 的动作目录定义是 `auth:false`（启动链第一跳，早于登录）——**它本来就是给"还没被信任的客户端"用的**，天然不该受"客户端是否够新"的约束。契约只说了"`m.cv < minClientVersion` → 9001"，没说豁免谁，这个坑必须由实现来填。

## 4. 修复

在网关层显式声明豁免集合，并把原因写进代码（避免后人当成"漏网之鱼"给补上）：

```ts
/** 不受版本闸约束的动作（少到可以硬编码，加了 ADR 再说）。 */
const VERSION_GATE_EXEMPT = new Set<string>(['config.manifest']);

// 版本闸（MUST-09）：放在鉴权之前 —— 旧客户端连登录都不该放进来。
// 只有登记过 config_release 才生效，本地开发默认不拦人。
// `config.manifest` 必须豁免：客户端要靠它才知道"自己太旧、该更新到哪个版本"，
// 把它一起拦了会形成死锁（拿不到更新信息 → 永远升不上去）。
if (!VERSION_GATE_EXEMPT.has(req.a)) { ... }
```

**顺带明确的两条口径**（都写进代码注释）：
1. 版本闸**只在登记过 `config_release` 记录时生效**。本地开发没有发布记录 → 不拦任何请求，符合"先本地开发，不用真机和认证备案"的要求。
2. 版本闸放在**鉴权之前**：旧客户端不该连登录都成功（否则会把旧版本的写入带进云端存档）。

**放弃的方案**：把 `minClientVersion` 从 manifest 响应里去掉，改由 `9001` 的 `msg` 带上版本号。
否决理由：`msg` 是给人看的字符串，客户端不该去正则解析它；而且拿不到 `packUrl` 就没法做包内热更，只剩"去商店更新"一条路。

## 5. 验证

```text
$ node --import ./tools/runtime/register.mjs --test tests/integration/auth.test.mjs
✔ AT-0105 config.manifest 与版本闸
ℹ tests 7  pass 7  fail 0
```

该用例三段断言正好覆盖闸门边界：

| 阶段 | 数据状态 | 断言 |
|---|---|---|
| 未登记发布记录 | `config_release` 空 | manifest 返回 `16921d30a67a934f`（与 `npm run gen` 完全一致）、`packUrl` 不出现、`minClientVersion = v0.1.0-s1`，且 `save.pull` 不被拦 |
| 登记 `minClient=v9.0.0` | 有发布记录 | `save.pull` → `9001`；`config.manifest` **仍返回 c=0** 且带 `deadbeefdeadbeef` / `v9.0.0` / `packUrl` |
| 门槛降回 `v0.1.0-s1` | 覆盖同 version | `save.pull` 不再返回 9001（同时验证 60s 缓存可失效） |

真实 HTTP 探针：`[probe] 通过 30，失败 0`，其中第 1 节就是 `config.manifest` 返回 `c=0` + 16 位 hex 的 configVersion。判定 **PASS**。

## 6. 回归与遗留

- **规则**：凡是"为了自救/引导而存在的接口"（配置清单、版本信息、健康检查、降级公告）**都不能被它自己引入的闸门拦住**。以后再加任何全局拦截（风控、限流、区域封锁）时，必须同时回答：豁免清单是谁？
- **遗留 1**：`VERSION_GATE_EXEMPT` 是硬编码集合。动作目录 `packages/contracts/src/common/actions.ts` 目前没有"需要豁免"的字段；若豁免动作超过 2~3 个，应升级为动作目录里的一个字段（`skipVersionGate: true`），走 ADR 后改。
- **遗留 2**：`activeMinClient()` 有 60s 缓存，改 `config_release` 后最多 60s 才生效。运维改门槛后应等一个缓存周期再观察，或调 `invalidateConfigCache()`（目前只在测试里用，没有运维入口）。
- **教训**：把"全局拦截"实现成"无条件全局"之前，先枚举一次**所有**动作，逐个问"拦它会不会让客户端失去自救能力"。测试要覆盖"被拦"和"不该被拦"两组，只测被拦的那半会漏掉死锁。
