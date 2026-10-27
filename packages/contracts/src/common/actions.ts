/** 动作目录（唯一登记处）。新增动作：在此登记 → 写类型 → 服务端实现 → 客户端调用。 */
export const ACTIONS = {
  'account.login': { module: 'account', auth: false, idempotent: true, desc: '平台 code 换会话；返回内部玩家ID、区服、是否新号' },
  'account.refresh': { module: 'account', auth: false, idempotent: false, desc: '刷新会话（令牌过期也可用，handler 自校验签名后重签发）' },
  'account.bindStart': { module: 'account', auth: true, idempotent: true, desc: '发起绑定，返回一次性绑定票据' },
  'account.bindConfirm': { module: 'account', auth: true, idempotent: true, desc: '在另一平台确认绑定，进入存档分叉选择' },
  'compliance.check': { module: 'compliance', auth: true, idempotent: false, desc: '实名/防沉迷状态与今日可玩时长' },
  'save.pull': { module: 'save', auth: true, idempotent: false, desc: '拉取云存档摘要/快照' },
  'save.push': { module: 'save', auth: true, idempotent: true, desc: '提交存档（带修订号）' },
  'save.resolveFork': { module: 'save', auth: true, idempotent: true, desc: '玩家选择保留哪份存档' },
  'salvage.claimInfo': { module: 'salvage', auth: true, idempotent: true, desc: '领取沉船信息份数' },
  'chest.open': { module: 'chest', auth: true, idempotent: true, desc: '开启带锁或无锁箱子并领取保底奖励' },
  'economy.buyQuota': { module: 'economy', auth: true, idempotent: true, desc: '购买区服每日限量物品（如高级开锁工具）' },
  'economy.sell': { module: 'economy', auth: true, idempotent: true, desc: '商人回收物品（影子账本校验，容差=0，ADR-0012）' },
  'leaderboard.report': { module: 'leaderboard', auth: true, idempotent: true, desc: '批量上报联网实时收获' },
  'leaderboard.query': { module: 'leaderboard', auth: true, idempotent: false, desc: '查询榜单快照' },
  'event.start': { module: 'event', auth: true, idempotent: true, desc: '开赶海场次：服务器生成种子与装备快照' },
  'event.submit': { module: 'event', auth: true, idempotent: true, desc: '提交操作事件，服务器复算计分' },
  'event.result': { module: 'event', auth: true, idempotent: false, desc: '查询本场结果与排名' },
  'social.send': { module: 'social', auth: true, idempotent: true, desc: '发送快捷短语' },
  'social.pull': { module: 'social', auth: true, idempotent: false, desc: '拉取频道消息' },
  'ads.claim': { module: 'ads', auth: true, idempotent: true, desc: '激励视频完成后领取奖励（幂等）' },
  'telemetry.track': { module: 'telemetry', auth: false, idempotent: false, desc: '批量埋点/错误上报' },
  'config.manifest': { module: 'config', auth: false, idempotent: false, desc: '获取当前 configVersion 与数值热更包地址' },
} as const;

export type ActionName = keyof typeof ACTIONS;
