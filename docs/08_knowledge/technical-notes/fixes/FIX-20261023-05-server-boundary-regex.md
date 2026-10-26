---
id: KB-FIX-20261023-05
title: 服务端依赖边界正则过宽，把 gateway/core 基础设施引用误判为跨模块违规
status: active
date: 2026-10-23
kind: env
severity: P1
module: cross
owner: hark
related: [KB-FIX-20261023-04, GOV-0002]
---

# 服务端依赖边界正则过宽，误判基础设施引用

## 1. 现象

服务端落地真实 handler 后，`npm run verify` 报 4 处跨模块违规：

```text
❌ 服务端依赖边界（4）
   - server/src/modules/account/handlers.ts：跨模块只能调用对方 service，发现 ../../gateway/handlers.ts
   - server/src/modules/compliance/handlers.ts：跨模块只能调用对方 service，发现 ../../gateway/handlers.ts
   - server/src/modules/compliance/service.ts：跨模块只能调用对方 service，发现 ../account/repo.ts
   - server/src/modules/save/handlers.ts：跨模块只能调用对方 service，发现 ../../gateway/handlers.ts
```

前 3 条是误报，第 4 条是真违规（下面分开处理）。

## 2. 影响

- **误报部分**：`gateway/`（网关、鉴权、幂等）与 `core/`（db、clock）是**基础设施**，不是业务模块。所有 handler 都必须依赖 `gateway/handlers.ts` 里的 `Handler` 类型——这是分层设计的核心，不是违规。误报会逼人要么给 guard 开个"无视规则"的注释后门，要么把类型定义复制三份，两种都比现状差。
- **真违规部分**：`compliance/service.ts` 直接读 `account` 模块的 `repo`，绕过 service。这一层若放任，repo 的入参/出参会逐渐被外部模块依赖，重构动不了——这才是这条规则要防的东西。

误报与真违规混在同一个报告里，会让人习惯性忽略报告，规则就死了。

## 3. 根因

`tools/guard/checks.mjs` 的 `serverBoundaries()`：

```js
const m = /\.\.\/([a-z-]+)\/(repo|handlers)(\.ts)?$/.exec(i);
if (m && m[1] !== mod) bad.push(...)
```

正则**没有起始锚点**。对 `../../gateway/handlers.ts` 来说，引擎从第 4 个字符开始匹配：`../` + `gateway` + `/handlers` + `.ts` + 结尾 —— 完全命中，`m[1]` 拿到 `gateway`，被当成"同级模块 gateway"。

也就是说：**任意 `../../xxx/handlers.ts` 都会被误判**，这条规则实际上把"依赖网关"当成了"跨业务模块"。

## 4. 修复

### 4.1 收窄规则（修误报）

```js
// 只查**同级模块**：`../<模块>/repo|handlers`。必须以 `../` 开头（恰好一层），
// 这样 `../../gateway/handlers.ts`、`../../core/db.ts` 这类基础设施引用不算违规
// —— gateway/core 不是业务模块，模块依赖它们（拿 Handler 类型、拿 db）是设计内的。
const m = /^\.\.\/([a-z-]+)\/(repo|handlers)(\.ts)?$/.exec(i);
```

加一个 `^` 即可：路径必须是"上一层就是目标模块目录"。`../../X` 天然不匹配。

### 4.2 修真违规（第 4 条）

`compliance` 需要判断"这个 playerId 是否真实存在"，原实现直接调 `account/repo.findPlayer()`。改为在 `account/service.ts` 开一个明确的对外出口：

```ts
// server/src/modules/account/service.ts
/**
 * 玩家是否真实存在（令牌里的 sub 有可能指向已注销的号）。
 * 供其他模块调用的出口 —— 跨模块只允许依赖 service，不允许直接读别的模块 repo。
 */
export async function playerExists(playerId: string): Promise<boolean> {
  const player = await findPlayer(playerId);
  return Boolean(player);
}
```

```ts
// server/src/modules/compliance/service.ts
import { playerExists } from '../account/service.ts';
export async function check(playerId: string): Promise<ComplianceRes> {
  return { verified: await playerExists(playerId), minor: false, offlineAllowanceMs: 0 };
}
```

**放弃的方案**：把 `Handler` 类型搬到 `packages/contracts`。
否决理由：`Handler` 依赖 `Claims`（服务端签发令牌的声明），搬进 contracts 会把服务端令牌结构泄漏成客户端可见契约；而且 `contracts` 是**前后端共享**层，不该放服务端内部分发签名。

## 5. 验证

```text
$ npm run verify
✅ 服务端依赖边界
...
全部守卫通过
ℹ tests 17  pass 17  fail 0
EXIT=0
```

反向验证（确认规则没被废掉）：把 `compliance/service.ts` 改回 `import { findPlayer } from '../account/repo.ts'` 重跑，守卫复现 1 条违规；改回后重新绿。判定 **PASS**。

## 6. 回归与遗留

- 规则现在的语义是：**业务模块之间**不许直接摸对方的 `repo`/`handlers`；对 `gateway`/`core` 的依赖不受限。
- **未被覆盖的缺口**：`../../xxx/service.ts`（两层跨过去调别人 service）现在不报错。当前架构下不存在这种写法（模块都在同一层，`../<mod>/` 就能到），所以有意不拦；一旦出现三层目录结构，这条规则需要重写。
- **教训**：写守卫正则一定要从**最短路径和最长路径两头**验证。这次只想着 `../account/repo.ts`，忘了 `../../gateway/handlers.ts` 也能被同一段子串命中。**guard 的误报比漏报更危险**——漏报是漏洞，误报会让人关掉闸门。
