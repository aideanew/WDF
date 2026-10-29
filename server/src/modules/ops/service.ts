/** ops · 业务与事务（运维开关：开区、封禁）。
 *  事务注意（同 account/service.ts）：回调内**只用入参 tx**，禁止调用全局 q()，
 *  否则与已开启的事务争抢单连接会永久死锁。 */
import { withTx } from '../../core/db.ts';
import { openRegion, banPlayer, recordAudit } from './repo.ts';

/** 开新开放区：事务内清旧 current、置新区、审计留痕。返回区 id。 */
export async function openNewRegion(id: string, name: string, operator = 'ops'): Promise<string> {
  await withTx(async (tx) => {
    await openRegion(id, name, tx);
    await recordAudit(operator, 'open_region', { id, name }, tx);
  });
  return id;
}

/** 封禁玩家到给定时间：事务内更新 banned_until + 审计留痕。返回是否命中玩家（0=不存在）。 */
export async function banUntil(playerId: string, untilIso: string, operator = 'ops'): Promise<number> {
  return withTx(async (tx) => {
    const n = await banPlayer(playerId, untilIso, tx);
    await recordAudit(operator, 'ban_player', { playerId, banned_until: untilIso }, tx);
    return n;
  });
}
