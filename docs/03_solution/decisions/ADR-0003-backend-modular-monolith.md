---
id: ADR-0003
title: 后端：模块化单体 HTTP 服务
status: proposed
owner: hark
created: 2026-10-23
review: 2026-11-23
---

# 后端：模块化单体 HTTP 服务

## 选项
A 平台云函数（微信云开发/抖音云）；B 每域一个 Serverless 函数；C 模块化单体容器服务。

## 决定（建议，待用户确认部署平台）
C：Node 22 + TypeScript + Fastify，无状态容器，单入口 `/v1/rpc`。微信与抖音调用同一域名。

## 后果
需要备案域名与 HTTPS；部署平台可选腾讯云容器类服务或其他，通过环境变量切换，不改代码。
