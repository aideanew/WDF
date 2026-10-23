| 任务 | 频率 | 幂等锁 |
|---|---|---|
| leaderboard-snapshot | 每 5–10 分钟 | job+分钟窗 |
| season-settle | 赛季末 | job+赛季ID |
| event-window | 每日 20:00 开 / 21:00 关（北京时间） | job+日期 |
| daily-reset | 每日 00:00（北京时间）限量与次数重置 | job+日期 |
| cleanup | 每日 | 过期聊天、幂等记录、旧分区 |
