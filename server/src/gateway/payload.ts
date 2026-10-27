/**
 * 入参运行时校验（ADR-0009：zod）。
 *
 * 覆盖策略：每个动作要么在此登记 schema，要么显式进入 `EXEMPT`（附理由）。
 * 契约测试 `tests/integration/payload.test.mjs` 会遍历 `ACTIONS`，断言"没有漏网之鱼"——
 * 新增动作后若忘了补 schema 或豁免，测试直接红。
 *
 * 校验失败统一返回 BAD_PAYLOAD(1001)，msg 带字段路径，便于客户端定位。
 */
import { z } from 'zod';
import type { ActionName } from '@wodefa/contracts';

const PlatformEnum = z.enum(['wechat', 'douyin', 'app']);
const Id = z.string().min(1).max(128);

export const PAYLOAD_SCHEMAS: Partial<Record<ActionName, z.ZodTypeAny>> = {
  // —— S1 四件（已上线）——
  'account.login': z.object({
    code: z.string().min(1).max(512),
    plat: PlatformEnum,
    anonymousSaveId: z.string().max(64).optional(),
  }),
  'compliance.check': z.unknown().optional(),
  'save.pull': z.unknown().optional(),
  'save.push': z.object({
    baseRevision: z.number().int().min(0),
    snapshot: z.unknown(),
    checksum: z.number().int(),
  }),

  // —— 刷新 / 绑定 ——
  'account.refresh': z.unknown().optional(), // 用 URL 上的旧令牌重签发，无业务入参
  'account.bindStart': z.unknown().optional(), // 发起绑定，无入参，返回一次性票据
  'account.bindConfirm': z.object({ ticket: Id }),

  // —— 存档分叉 ——
  'save.resolveFork': z.object({
    keep: z.enum(['local', 'cloud']),
    localSnapshot: z.unknown().optional(),
  }),

  // —— 沉船信息 / 经济限购 ——
  'salvage.claimInfo': z.object({ tier: z.enum(['normal', 'advanced', 'exclusive']) }),
  'chest.open': z.object({
    itemId: Id,
  }),
  'economy.buyQuota': z.object({
    itemId: Id,
    count: z.number().int().min(1).max(9999),
  }),
  // 商人回收（ADR-0012）：merchantId 可选，缺省 merchant_village（服务端兜底）
  'economy.sell': z.object({
    itemId: Id,
    count: z.number().int().min(1).max(999),
    merchantId: z.enum(['merchant_village', 'merchant_wander', 'merchant_black']).optional(),
  }),

  // —— 排行榜 ——
  'leaderboard.report': z.object({
    seq: z.number().int().min(0),
    events: z.array(z.unknown()),
  }),
  'leaderboard.query': z.object({
    scope: z.enum(['global', 'region', 'province']),
    cursor: z.string().max(256).optional(),
    limit: z.number().int().min(1).max(200),
  }),

  // —— 赶海场次 ——
  'event.start': z.object({
    hookItemId: Id,
    lockpickToolIds: z.array(Id),
  }),
  'event.submit': z.object({
    sessionId: Id,
    ops: z.array(z.unknown()),
  }),
  'event.result': z.object({ sessionId: Id }),

  // —— 社交快捷语 ——
  'social.send': z.object({
    channel: z.enum(['region', 'world']),
    phraseId: Id,
  }),
  'social.pull': z.object({
    channel: z.enum(['region', 'world']),
    after: z.string().max(256).optional(),
  }),

  // —— 广告领取 / 埋点 ——
  'ads.claim': z.object({ placement: Id }),
  'telemetry.track': z.object({ events: z.array(z.unknown()) }),

  // —— 配置清单（无入参）——
  'config.manifest': z.unknown().optional(),
};

/**
 * 显式豁免清单：登记过但**刻意不校验**的动作，附理由。
 * 目前空——上面的 PAYLOAD_SCHEMAS 已覆盖 ACTIONS 全部 20 个动作。
 * 若未来某个动作要"先放行再补 schema"，在此登记并写清理由，契约测试仍会承认。
 */
export const EXEMPT: Partial<Record<ActionName, string>> = {};

export type PayloadCheck = { ok: true } | { ok: false; msg: string };

export function checkPayload(action: ActionName, payload: unknown): PayloadCheck {
  const schema = PAYLOAD_SCHEMAS[action];
  if (!schema) return { ok: true }; // 豁免：不校验
  const r = schema.safeParse(payload);
  if (r.success) return { ok: true };
  const issue = r.error.issues[0];
  const path = issue?.path?.length ? issue.path.join('.') : '(root)';
  return { ok: false, msg: `${path}: ${issue?.message ?? 'invalid payload'}` };
}
