import type { Handler } from '../../gateway/handlers.ts';
import type { ChestOpenReq } from '@wodefa/contracts/src/chest/index.ts';
import { openChest, ChestError } from './service.ts';

export const chestHandlers: Record<'chest.open', Handler> = {
  'chest.open': async (req, t, ctx) => {
    if (!ctx.claims?.sub) throw new Error('Unauthenticated');
    const p = req.p as ChestOpenReq;
    try {
      const res = await openChest(ctx.claims.sub, p.itemId);
      return { c: 0, d: res, t };
    } catch (e) {
      if (e instanceof ChestError) return { c: e.code, msg: e.message, t };
      throw e;
    }
  },
};
