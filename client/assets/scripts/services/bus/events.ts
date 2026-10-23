/** 领域事件名（集中定义，避免字符串散落）。 */
export const EV = {
  ITEM_COLLECTED: 'item.collected',
  INVENTORY_CHANGED: 'inventory.changed',
  RAFT_CHANGED: 'raft.changed',
  BUOYANCY_LOW: 'raft.buoyancyLow',
  TIDE_STARTED: 'sea.tideStarted',
  TIDE_ENDED: 'sea.tideEnded',
  LEVEL_UP: 'progression.levelUp',
  RAID_RESOLVED: 'defense.raidResolved',
  SAVE_WRITTEN: 'save.written',
  NETWORK_CHANGED: 'net.changed',
} as const;
