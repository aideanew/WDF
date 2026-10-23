// 让 Node 22 直接运行 TS 源码（测试与服务端开发）：相对导入不写扩展名（为兼容 Cocos），这里自动补 .ts
import { register } from 'node:module';
register('./resolve-ts.mjs', import.meta.url);
