import { mkdirSync } from 'node:fs';
import { p } from './lib/util.mjs';
for (const d of ['ai', 'logs', 'screenshots', 'scratch', 'playtests', 'builds']) mkdirSync(p('.local', d), { recursive: true });
console.log('✅ .local/ 已建立（不进 Git）。下一步：npm run verify；用 Cocos Dashboard 打开 client/。');
