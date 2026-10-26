# EVD-0105 —— compliance.check / config.manifest / 客户端版本闸

- **对应任务**：[TASK-0105](../../../05_execution/tasks/TASK-0105.md)（AT-0105）
- **采集时间**：2026-10-23 17:4x
- **环境**：Windows 10 / Node v24.12.0 / PGlite 0.5.11
- **判定**：**PASS**（4 条验收标准全部覆盖）

## 1. 验收标准逐条对应

| TASK-0105 验收标准 | 断言 | 结果 |
|---|---|---|
| 1. `configVersion` 与 `npm run gen` 输出**完全一致** | `config.manifest` 未登记发布记录时返回 `16921d30a67a934f`；`npm run gen` 同次输出 `configVersion=16921d30a67a934f` | ✅ |
| 2. `packUrl` 为空时不报错（返回 `undefined`） | `assert.equal(res.d.packUrl, undefined)`；`JSON` 序列化后字段不出现 | ✅ |
| 3. 构造 `cv` 低于下限 → `c=9001` | 登记 `min_client=v9.0.0` 后，`save.pull`（cv=`v0.1.0-s1`）返回 `9001` | ✅ |
| 4. `npm run verify` 通过 | 见 §4 | ✅ |

## 2. 集成测试输出

```text
$ node --import ./tools/runtime/register.mjs --test tests/integration/auth.test.mjs
✔ AT-0105 compliance.check
✔ AT-0105 config.manifest 与版本闸
ℹ tests 7   pass 7   fail 0
```

`compliance.check` 断言：登录后 `verified=true`、`minor=false`、`offlineAllowanceMs=0`（ADR-0008 必须联网）。

## 3. 版本闸三段边界（本卡最关键的一条）

测试用 `config_release` 表直接构造三种状态，`invalidateConfigCache()` 清 60s 缓存：

| 阶段 | 数据状态 | 断言结果 |
|---|---|---|
| A. 未登记发布记录 | `config_release` 空 | manifest → `16921d30a67a934f` / `v0.1.0-s1` / 无 `packUrl`；`save.pull` **不拦** |
| B. 登记 `min_client=v9.0.0` | 有记录 | `save.pull` → `9001 CLIENT_TOO_OLD`；`config.manifest` **仍 `c=0`**（豁免，见 KB-FIX-20261023-06） |
| C. 门槛降回 `v0.1.0-s1` | 同 version 覆盖 | `save.pull` 不再返回 `9001` |

> 口径说明：**只有登记过 `config_release` 才启用版本闸**。本地开发没有发布记录 → 不拦任何请求。这是"先本地开发，不用真机和认证备案"的直接落地。

## 4. 全量闸门

```text
$ npm run verify
✅ 数值生成完成：46 张表，0 行，configVersion=16921d30a67a934f
全部守卫通过
ℹ tests 17   pass 17   fail 0
EXIT=0
```

## 5. 真实 HTTP 探针

```text
== 1. config.manifest（启动链第 2 步） ==
  ✅ c === 0
  ✅ configVersion 形如 16 位 hex
  ✅ minClientVersion 非空
[probe] 通过 30，失败 0
```

## 6. 已知缺口

- `compliance.check` 的 `verified` 语义是"**能登录即视为实名通过**"（本地开发口径），**不是真实实名结果**。真实实名/防沉迷链路在 AT-1003，接通前不得把该字段当作合规结论对运营/审核汇报。
- `config.manifest` 完全不校验 `m.cv`（豁免版本闸），这是设计如此；但**它自己也没做请求频率限制**，上线前应挂限流。
