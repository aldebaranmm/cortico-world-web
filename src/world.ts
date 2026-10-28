/**
 * World 实现：给桌宠一条非视觉的取数通道。
 * 桌宠本身只有截图一条路（慢，每步都要跑一次模型）；这里把网页和 B 站接口直接取成文字。
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ToolDef, World, WorldHost } from 'cortico/core/types.ts';
import type { WorldContext } from 'cortico/world.ts';
import { ENV_PROMPT_DEFAULT, ENV_PROMPT_FILE, WEB_ID, type WebSection } from './config.ts';
import { bilibili, fetchAsText, type BilibiliKind } from './web.ts';

export interface WebWorldOptions {
  cfg: WebSection;
  persist(patch: Partial<WebSection>): void;
  envPromptFile: string;
  dataDir: string;
  log?(message: string): void;
}

const BILI_KINDS: BilibiliKind[] = ['popular', 'ranking', 'view', 'search'];

export class WebWorld implements World {
  /** 装配层校验：实例 id 必须等于定义 id，否则整个 World 装不上。 */
  readonly id = WEB_ID;

  private readonly opts: WebWorldOptions;
  private host: WorldHost | null = null;

  constructor(opts: WebWorldOptions) {
    this.opts = opts;
  }

  get cfg(): WebSection {
    return this.opts.cfg;
  }

  /* ---------- 工具 ---------- */

  tools(): ToolDef[] {
    if (this.cfg.enabled === false) return [];
    return [this.fetchTool(), this.bilibiliTool()];
  }

  /** 抓任意网页或接口，取成文字。 */
  private fetchTool(): ToolDef {
    return {
      name: 'web_fetch',
      tags: ['read'],
      description:
        '取一个网页或接口的内容，以文字返回。JSON 会整理好再给，网页会去掉脚本样式只留正文。' +
        '想知道网页上写了什么、想读一篇文章、想拿接口数据时用它——一次调用就够，不要为此去截屏。' +
        '只读，不会改动任何东西；需要登录才看得见的页面取不到。',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: '完整的 http/https 地址。' },
          maxChars: {
            type: 'integer',
            minimum: 200,
            maximum: 60000,
            description: '最多返回多少字；默认按配置（6000）。长文章可以调大。',
          },
        },
        required: ['url'],
      },
      summary: {
        zh: '把一个网页或接口取成文字，不用截图。',
        en: 'Reads a web page or API as text, no screenshot needed.',
      },
      handler: async (args) => {
        const url = String(args.url ?? '').trim();
        if (!url) return '（要给地址才会去取）';
        const maxChars = Number(args.maxChars) || undefined;
        const text = await fetchAsText(url, { cfg: this.cfg, maxChars });
        this.opts.log?.(`web_fetch ${url} → ${text.length} 字`);
        return text;
      },
    };
  }

  /** B 站取数：热门／排行榜／视频详情／搜索，无需登录。 */
  private bilibiliTool(): ToolDef {
    return {
      name: 'web_bilibili',
      tags: ['read'],
      description:
        '取 B 站的内容，一次拿全，不用打开浏览器也不用截图：' +
        'kind=popular 热门视频，kind=ranking 排行榜，kind=view 某条视频的详情（要传 bvid），kind=search 按关键词搜索。' +
        '返回的是标题、UP 主、播放量、弹幕、时长和链接这些文字信息，不是画面。' +
        '主人让你「刷 B 站」时，先用这个取一批，挑有意思的说给他听。',
      parameters: {
        type: 'object',
        properties: {
          kind: {
            type: 'string',
            enum: BILI_KINDS,
            description: 'popular 热门；ranking 排行榜；view 单条视频详情；search 关键词搜索。',
          },
          keyword: { type: 'string', description: 'kind=search 时的搜索关键词。' },
          bvid: { type: 'string', description: 'kind=view 时的视频号，形如 BV1xx411c7mD。' },
          limit: { type: 'integer', minimum: 1, maximum: 50, description: '取几条，默认 20。' },
          rid: {
            type: 'integer',
            description: 'kind=ranking 时的分区号，0 全站。常见：0 全站、1 动画、3 音乐、4 游戏、36 科技、188 数码、234 运动。',
          },
        },
        required: ['kind'],
      },
      summary: {
        zh: '一次取回 B 站热门、排行、视频详情或搜索结果。',
        en: 'Fetches Bilibili popular, ranking, video detail or search results in one call.',
      },
      handler: async (args) => {
        const kind = String(args.kind ?? '').trim() as BilibiliKind;
        if (!BILI_KINDS.includes(kind)) return `kind 要是这几个之一：${BILI_KINDS.join(' / ')}`;
        const text = await bilibili(
          kind,
          {
            keyword: args.keyword == null ? undefined : String(args.keyword),
            bvid: args.bvid == null ? undefined : String(args.bvid),
            limit: Number(args.limit) || undefined,
            rid: args.rid == null ? undefined : Number(args.rid),
          },
          this.cfg,
        );
        this.opts.log?.(`web_bilibili ${kind} → ${text.length} 字`);
        return text;
      },
    };
  }

  /* ---------- 生命周期 ---------- */

  async start(host: WorldHost): Promise<void> {
    this.host = host;
    this.opts.log?.(
      `已启动（上限 ${this.cfg.maxChars} 字，超时 ${this.cfg.timeoutMs / 1000}s，内网${this.cfg.allowLocal ? '允许' : '禁止'}${
        this.cfg.allowHosts.length > 0 ? `，限 ${this.cfg.allowHosts.join('、')}` : ''
      }）`,
    );
  }

  async stop(): Promise<void> {
    this.host = null;
  }

  /** 返回空对象＝保留无变量模板全文。 */
  envPromptVars(): Record<string, string> | null {
    return this.cfg.enabled === false ? null : {};
  }

  webUi() {
    return {
      label: '网页',
      promptDocs: [
        {
          key: 'worlds.web.envPrompt',
          title: '网页与 B 站规则',
          description: '桌宠什么时候该直接取数据、什么时候才该去截图看屏幕。可直接在控制台编辑。',
          path: this.opts.envPromptFile,
          role: 'envPrompt' as const,
        },
      ],
    };
  }
}

export function createWebWorld(ctx: WorldContext<WebSection>): WebWorld {
  // dataDir 是各 World 共享的（astrbot 已经占了 data/ENV_PROMPT.md），
  // 所以放进自己的子目录，免得读到别人的提示词、自己的也写不进去。
  const worldDir = join(ctx.dataDir, 'worlds', WEB_ID);
  const envPromptFile = join(worldDir, ENV_PROMPT_FILE);
  try {
    mkdirSync(worldDir, { recursive: true });
    if (!existsSync(envPromptFile)) writeFileSync(envPromptFile, ENV_PROMPT_DEFAULT, 'utf8');
  } catch {
    // 写不出来只影响环境提示词，模板按空处理，不牵连 World 挂载
  }
  return new WebWorld({
    envPromptFile,
    dataDir: ctx.dataDir,
    cfg: ctx.cfg,
    persist: (patch) => ctx.persist(patch),
    log: (message) => console.log(`[web] ${message}`),
  });
}
