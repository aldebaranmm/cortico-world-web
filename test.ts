import { bilibili, fetchAsText } from './src/web.ts';
import { WEB_DEFAULTS } from './src/config.ts';

const cfg = WEB_DEFAULTS;

console.log('=== 1. 热门（前5条）===');
console.log(await bilibili('popular', { limit: 5 }, cfg));

console.log('\n=== 2. 排行榜（前3条）===');
console.log(await bilibili('ranking', { limit: 3 }, cfg));

console.log('\n=== 3. 搜索「大肥鱼」===');
console.log(await bilibili('search', { keyword: '大肥鱼', limit: 5 }, cfg));

console.log('\n=== 4. 视频详情 ===');
console.log(await bilibili('view', { bvid: 'BV1GJ411x7h7' }, cfg));

console.log('\n=== 5. 网页正文抓取 ===');
console.log((await fetchAsText('https://example.com', { cfg })).slice(0, 300));

console.log('\n=== 6. 内网拦截（应报错）===');
console.log(await fetchAsText('http://127.0.0.1:6190/bridge/push', { cfg }));
