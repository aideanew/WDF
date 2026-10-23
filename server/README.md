# server/ —— 模块化单体（ADR-0003，待用户确认部署平台）

```
src/
├── main.ts / app.ts      # 启动、装配
├── gateway/              # /v1/rpc 与 /v1/batch：鉴权 → 限流 → 版本协商 → 幂等 → 分发
├── core/                 # db、errors、logger、clock、config、ids
├── integrations/         # 平台服务端接口（code2session、内容安全）
├── modules/<m>/          # handlers.ts（动作实现）· service.ts（业务+事务）· repo.ts（SQL）· README.md
└── jobs/                 # 定时任务（幂等，以“任务名+时间窗”加锁）
db/migrations/            # 顺序 SQL，已执行的永不修改
generated/config/         # 服务端权威数值（npm run gen:config 生成）
deploy/                   # Dockerfile 与部署说明
```

依赖方向：`gateway → modules/*/handlers → service → repo → core/db`；跨模块只调用对方 `service` 的导出。
