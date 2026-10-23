import * as checks from './checks.mjs';
const names = { rootWhitelist: '根目录白名单', gameCorePurity: 'game-core/contracts 纯度', clientBoundaries: '客户端依赖边界', serverBoundaries: '服务端依赖边界', catalogConsistency: '模块清单与目录一致', bundles: 'Asset Bundle 规则', generatedUntouched: '生成物未手改且已同步', docsFrontMatter: '文档 front matter', everyDirExplained: '无空目录' };
let fail = 0;
for (const [k, label] of Object.entries(names)) {
  const issues = checks[k]();
  if (issues.length) { fail += issues.length; console.log(`❌ ${label}（${issues.length}）\n   - ` + issues.slice(0, 30).join('\n   - ')); }
  else console.log(`✅ ${label}`);
}
if (fail) { console.log(`\n守卫未通过：${fail} 处`); process.exit(1); }
console.log('\n全部守卫通过');
