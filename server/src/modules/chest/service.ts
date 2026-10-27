/**
 * chest · 业务与事务
 *
 * 开箱的三条硬规则：
 *
 *  1. **箱型校验**（F-31）：`itemId` 必须是 `chests.csv` 里的箱子。四种锁
 *     `item_0068`~`item_0071` 是挂在箱子上的物品、不是箱子本身，必须被拒。
 *     否则玩家可把任意物品（甚至 29640 的金锁）当箱子"开"，扣掉它换一个保底奖励。
 *
 *  2. **同事务原子写**（F-33）：校验、扣箱、发奖、写账本全部在
 *     `updateSnapshotServerSide` 的同一个事务内完成。旧实现是 `pull()`（无事务）
 *     + `updateSnapshotServerSide()`（另开事务），两次读之间可被并发改掉 → 双花。
 *
 *  3. **账本必写**（F-29）：扣箱与发奖各写一条 `ledger_entry`。ADR-0012 规定账本是权威、
 *     存档是投影、容差 0。只改存档不记账，玩家拿奖励去 `economy.sell` 时
 *     影子账本校验必然失败（返回 1001）。
 *
 * **v1.0 不做开锁**：设计源把「所有材质箱子与五类锁组合形成的完整开锁矩阵」列为
 * 「首版建议延期」（`对话讨论.txt:5117`），且"每级工具能开哪些锁 / 消耗多少耐久 /
 * 各档锁收益"三点至今无定义。因此 `chests.csv` 三行 `lock` 全为 `none`，本函数不读锁档。
 */
import { ERR } from '@wodefa/contracts';
import type { ChestOpenRes } from '@wodefa/contracts/src/chest/index.ts';
import { updateSnapshotServerSide } from '../save/service.ts';
import { grantItem, consumeItem } from '../economy/service.ts';
import { findChestByItemId } from './repo.ts';

/**
 * 业务错误（携带契约错误码）。
 *
 * 码值必须来自 `ERR` 的 15 码表 —— **禁止自造数字**。
 * 历史事故：此处曾定义 `const ERR_SHADOW_STATE_MISMATCH = 3103`，15 码里没有 3103，
 * 且注释自承"硬编码以适配测试"。它绕过了 `ux.ts` 的
 * `satisfies Record<keyof typeof ERR>` 约束——那个约束只能拦"改 ERR 不补映射"，
 * 拦不住"在 service 里直接写数字"。
 */
export class ChestError extends Error {
  readonly code: number;
  constructor(code: number, message: string) {
    super(message);
    this.name = 'ChestError';
    this.code = code;
  }
}

/**
 * 保底奖励。**D-27 临时口径**：设计源从未定义"箱子开出什么"
 * （`对话讨论.txt:4247` 把它列为待回答问题），`drops` 表 0 行不是漏填，是本来就没规则。
 * 等设计源给了掉落规则再改这里，**不要自己编随机**（违反 R-2 不猜数值）。
 */
const REWARD_ITEM_ID = 'item_0020';
const REWARD_COUNT = 1;

/** 账本流水的事由标签，与动作名一致，便于按 reason 对账。 */
const LEDGER_REASON = 'chest.open';

/**
 * 执行开箱。
 *
 * 幂等由网关统一处理（`gateway/rpc.ts` 按 `meta.rid` 查 `idempotency` 表，只缓存 `c===0`），
 * 本函数**不做幂等**——重复实现会和网关打架。
 */
export async function openChest(playerId: string, itemId: string): Promise<ChestOpenRes> {
  // ① 箱型校验：不是箱子直接拒（含四种锁、木棍、材料、工具）
  if (!findChestByItemId(itemId)) {
    throw new ChestError(ERR.BAD_PAYLOAD, `${itemId} is not a chest`);
  }

  // ② 扣箱 + 发奖 + 双条账本，全部同一事务
  const updated = await updateSnapshotServerSide(
    playerId,
    async (body, tx) => {
      const modules = (body?.modules ?? {}) as Record<string, unknown>;
      const inv = (modules.inventory ?? {}) as Record<string, number>;
      const have = inv[itemId];
      if (typeof have !== 'number' || have <= 0) {
        throw new ChestError(ERR.BAD_PAYLOAD, `No chest ${itemId} in inventory`);
      }

      const nextInv: Record<string, number> = { ...inv };
      if (have > 1) nextInv[itemId] = have - 1;
      else delete nextInv[itemId];
      nextInv[REWARD_ITEM_ID] = (nextInv[REWARD_ITEM_ID] ?? 0) + REWARD_COUNT;

      // 账本写在同一个 tx 里：存档回滚账本也回滚，
      // 不会出现"东西发了但没记账"或"记了账但存档没落地"。
      await consumeItem(playerId, itemId, 1, LEDGER_REASON, tx);
      await grantItem(playerId, REWARD_ITEM_ID, REWARD_COUNT, LEDGER_REASON, tx);

      return { body: { ...body, modules: { ...modules, inventory: nextInv } } };
    },
    Date.now(),
  );

  // ③ 无存档不再静默成功（F-32）
  if (!updated) {
    throw new ChestError(ERR.NOT_LOGGED_IN, 'no save for player');
  }

  return { success: true, rewards: [{ itemId: REWARD_ITEM_ID, count: REWARD_COUNT }] };
}
