/** 本地存档：主副两份 + 校验和（game-core/save）；关键操作后立即写本地；云端节流同步（≥60 秒合并）+ 上线/下线同步；分叉两份都保留由玩家选择。 */
export const SERVICE = 'save';
