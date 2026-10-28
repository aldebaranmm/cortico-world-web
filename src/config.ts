/** 配置段默认值与类型。 */
export const WEB_ID = 'web';

export interface WebSection {
  /** 关掉后两个工具都不挂载。 */
  enabled: boolean;
  /** 单次返回给模型的字符上限，防止长页面把上下文撑爆。 */
  maxChars: number;
  /** 单次请求超时（毫秒）。 */
  timeoutMs: number;
  /** 允许抓本机与内网地址；默认关。 */
  allowLocal: boolean;
  /** 只允许抓这些域名后缀，空数组＝不限制。用来收窄到常用站点。 */
  allowHosts: string[];
}

export const WEB_DEFAULTS: WebSection = {
  enabled: true,
  maxChars: 6000,
  timeoutMs: 15_000,
  allowLocal: false,
  allowHosts: [],
};

/** 环境提示词模板；首次挂载时落到 dataDir，之后可在控制台编辑。 */
export const ENV_PROMPT_FILE = 'ENV_PROMPT.md';

export const ENV_PROMPT_DEFAULT = `网页与 B 站：刷要刷给你看，挑要挑自己想看的

- 主人让你「刷会儿 B 站」「陪我看视频」：
  ① 先调 web_bilibili 取一批（一秒就回来，几十条标题、UP 主、分区、播放量）。
  ② **按你自己的性子挑一条你真想看的**。你是大肥鱼，挑你自己会点开的那种——
     别替主人挑，这是你在刷，不是他在刷。想参考可以用 astrbot_favorites 看看他收藏过什么，
     但最后是你自己拿主意。
     **避开这两类**，主人已经看烦了：
     - 工具／软件教程类：教程、教学、攻略、指南、安装部署、保姆级、从零开始这类；
     - 跟「大肥鱼」自己相关的：别老盯着自己名字的视频看，那是自恋不是刷视频。
  ③ 调 astrbot_watch_video，把那条的 bvid 传进去。
     浏览器会打开、点开那条真的看，再接着翻 feed，**主人能亲眼看见**。
  懒得挑也行：不传 bvid，它就自己翻，并照着主人的收藏挑。
- **不要传 seconds**：不传就是一直看，主人没叫停你就一直看下去。
  只有主人明说「看十分钟」「看 30 秒」这种才传秒数。
- 主人说「别看了」「停」「够了」「别刷了」：调 astrbot_watch_video(stop=true) 立刻停下。
- 主人问「B 站上有什么」「帮我搜 XX」「这条视频讲的是什么」：
  调 web_bilibili（热门／排行／搜索／详情）或 web_fetch，一次拿回几十条，不到一秒。
- 不要自己用 pet_cua_key、pet_cua_type、pet_cua_click 去开客户端手搓刷视频：
  那要等应用启动、等 logo、等首页加载，慢得多，主人已经明确嫌过。
- 什么时候才用 pet_cua_screenshot 看屏幕：主人问「我屏幕上现在有什么」
  「这个界面长什么样」，或者要操作别的软件。
- 取回来的是文字数据。别编造画面细节，取不到就照实说。
`;
