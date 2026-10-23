# @wodefa/contracts

- `common/envelope.ts`：请求/响应封套。
- `common/errors.ts`：错误码分段。
- `common/actions.ts`：**动作目录唯一登记处**（名称、所属模块、是否需登录、是否写操作需 rid）。服务端网关以 `satisfies Record<ActionName, Handler>` 绑定，漏实现即编译失败；`docs/03_solution/data/api-catalog.md` 由它生成。
- `<module>/index.ts`：该模块的请求/响应类型。

客户端只 `import type`（零运行时体积）；运行时校验在服务端用 zod 实现（server/src/modules/<m>/schema.ts）。
