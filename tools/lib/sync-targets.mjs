// sync 的源→目标映射，唯一来源。
// tools/sync/to-client.mjs 靠它生成，tools/guard/checks.mjs 靠它校验「源与副本同步」。
// 此前这个字面量在两处各写一份，改一处忘另一处会让 sync 与 guard 悄悄漂移。
export const SYNC_TARGETS = [
  ['packages/game-core/src', 'game-core'],
  ['packages/contracts/src', 'contracts'],
];
