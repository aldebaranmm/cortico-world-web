/**
 * 抓取核心：把网页和接口取成模型直接能读的文字。
 * 纯 Node 全局 fetch，零依赖；是给桌宠的非视觉通道，用来替代「截图→看→点→再截图」的慢循环。
 */
import type { WebSection } from './config.ts';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

/** 内网地址段，默认拦掉。 */
function isLocalHost(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, '');
  return (
    h === 'localhost' ||
    h === '127.0.0.1' ||
    h === '::1' ||
    h.endsWith('.local') ||
    /^10\./.test(h) ||
    /^192\.168\./.test(h) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(h) ||
    /^169\.254\./.test(h)
  );
}

/** 校验并归一化 URL；不合法或越权直接抛错，不发起请求。 */
export function guardUrl(raw: string, cfg: WebSection): URL {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    throw new Error(`这不是一个合法地址：${raw}`);
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new Error(`只支持 http/https，收到的是 ${u.protocol}`);
  }
  if (isLocalHost(u.hostname) && !cfg.allowLocal) {
    throw new Error(`本机与内网地址默认不抓取（${u.hostname}）；需要的话请主人打开 web 扩展的「允许内网」开关。`);
  }
  if (cfg.allowHosts.length > 0) {
    const host = u.hostname.toLowerCase();
    const ok = cfg.allowHosts.some((s) => {
      const k = s.toLowerCase().replace(/^\*\./, '');
      return host === k || host.endsWith(`.${k}`);
    });
    if (!ok) throw new Error(`这个域名不在允许列表里（${host}）：${cfg.allowHosts.join('、')}`);
  }
  return u;
}

export function clip(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}\n\n…（已截断，原文更长；需要更多请换个更具体的地址再取）`;
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  hellip: '…',
  mdash: '—',
  ldquo: '“',
  rdquo: '”',
  lsquo: '‘',
  rsquo: '’',
};

function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => safeChar(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => safeChar(parseInt(d, 10)))
    .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m);
}

function safeChar(code: number): string {
  return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
}

/** HTML → 可读文字。够用就好：丢掉脚本样式，保留换行与列表感。 */
export function htmlToText(html: string): string {
  let s = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
  s = s.replace(/<(br|hr)\s*\/?>/gi, '\n');
  s = s.replace(/<\/(p|div|li|tr|h[1-6]|section|article|td)>/gi, '\n');
  s = s.replace(/<li[^>]*>/gi, '\n- ');
  s = s.replace(/<(h[1-6])[^>]*>/gi, '\n## ');
  s = s.replace(/<[^>]+>/g, ' ');
  s = decodeEntities(s);
  s = s.replace(/[ \t 　]+/g, ' ');
  s = s.replace(/ *\n */g, '\n');
  s = s.replace(/\n{3,}/g, '\n\n');
  return s.trim();
}

/** 把 JSON 压成紧凑可读的文本，避免原始 JSON 里大量无用字段占用上下文。 */
function prettyJson(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 1);
  } catch {
    return raw;
  }
}

export interface FetchOptions {
  cfg: WebSection;
  maxChars?: number;
  /** 直接返回原始 JSON 文本，由调用方自己精简。 */
  rawJson?: boolean;
}

/** 抓一个地址，返回模型可读的文字。 */
export async function fetchAsText(rawUrl: string, opts: FetchOptions): Promise<string> {
  const { cfg } = opts;
  const max = Math.min(Math.max(opts.maxChars ?? cfg.maxChars, 200), 60_000);
  let u: URL;
  try {
    u = guardUrl(rawUrl, cfg);
  } catch (err) {
    return `取不到：${err instanceof Error ? err.message : String(err)}`;
  }
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), cfg.timeoutMs);
  try {
    const resp = await fetch(u, {
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/json,text/plain;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
      signal: ctl.signal,
      redirect: 'follow',
    });
    const body = await resp.text();
    if (!resp.ok) return `取不到：HTTP ${resp.status} ${resp.statusText}`;
    const type = (resp.headers.get('content-type') ?? '').toLowerCase();
    if (opts.rawJson) return body;
    if (type.includes('json') || /^\s*[[{]/.test(body)) return clip(prettyJson(body), max);
    if (type.includes('html') || /^\s*<(!doctype|html)/i.test(body)) return clip(htmlToText(body), max);
    return clip(body, max);
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') return `取不到：超过 ${cfg.timeoutMs / 1000} 秒没响应`;
    return `取不到：${err instanceof Error ? err.message : String(err)}`;
  } finally {
    clearTimeout(timer);
  }
}

/* ---------------- B 站 ---------------- */

function num(n: unknown): string {
  const v = Number(n);
  if (!Number.isFinite(v)) return '0';
  if (v >= 100_000_000) return `${(v / 100_000_000).toFixed(1)}亿`;
  if (v >= 10_000) return `${(v / 10_000).toFixed(1)}万`;
  return String(v);
}

function mmss(sec: unknown): string {
  const s = Number(sec);
  if (!Number.isFinite(s) || s <= 0) return '—';
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

function firstLine(s: unknown, n = 90): string {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

/** 一条视频精简成一行。 */
function line(v: any, i: number): string {
  const bvid = v?.bvid ?? '';
  const url = bvid ? `https://www.bilibili.com/video/${bvid}` : '';
  const parts = [
    `${i}. ${v?.title ?? '（无标题）'}`,
    `UP ${v?.owner?.name ?? '?'}`,
    `播放 ${num(v?.stat?.view)}`,
    `弹幕 ${num(v?.stat?.danmaku)}`,
    `${mmss(v?.duration ?? v?.stat?.duration)}${v?.videos > 1 ? `（${v.videos}P）` : ''}`,
    v?.tname ? v.tname : '',
    url,
  ].filter(Boolean);
  let out = parts.join(' | ');
  const desc = firstLine(v?.desc, 70);
  if (desc) out += `\n   简介：${desc}`;
  return out;
}

export type BilibiliKind = 'popular' | 'ranking' | 'view' | 'search';

/**
 * B 站取数。热门／排行／详情走公开接口，无需登录，一次拿全；
 * 搜索接口有反爬签名，抓不到时改为抓搜索页正文兜底。
 */
export async function bilibili(
  kind: BilibiliKind,
  params: { keyword?: string; bvid?: string; limit?: number; rid?: number },
  cfg: WebSection,
): Promise<string> {
  const limit = Math.min(Math.max(params.limit ?? 20, 1), 50);
  const common = { cfg, rawJson: true };

  if (kind === 'view') {
    const bvid = (params.bvid ?? '').trim();
    if (!bvid) return '缺少 bvid（视频号，形如 BV1xx411c7mD）。';
    const raw = await fetchAsText(`https://api.bilibili.com/x/web-interface/view?bvid=${encodeURIComponent(bvid)}`, common);
    return detail(raw);
  }

  if (kind === 'search') {
    const kw = (params.keyword ?? '').trim();
    if (!kw) return '缺少关键词。';
    const api = `https://api.bilibili.com/x/web-interface/search/type?search_type=video&keyword=${encodeURIComponent(kw)}&page=1`;
    const raw = await fetchAsText(api, common);
    if (raw.trimStart().startsWith('{')) {
      try {
        const j = JSON.parse(raw);
        if (j.code === 0 && Array.isArray(j?.data?.result)) {
          const head = `B 站搜索「${kw}」，取到 ${j.data.result.length} 条：\n`;
          return clip(head + j.data.result.slice(0, limit).map((v: any, i: number) => {
            const title = String(v?.title ?? '').replace(/<[^>]+>/g, '');
            const bvid = v?.bvid ?? '';
            return `${i + 1}. ${title} | UP ${v?.author ?? '?'} | 播放 ${num(v?.play)} | 弹幕 ${num(v?.video_review)} | ${
              mmss(v?.duration)
            }${bvid ? ` | https://www.bilibili.com/video/${bvid}` : ''}`;
          }).join('\n'), cfg.maxChars);
        }
      } catch {
        // 落到下面的网页兜底
      }
    }
    // 接口被拦：抓搜索页正文
    const page = await fetchAsText(`https://search.bilibili.com/all?keyword=${encodeURIComponent(kw)}`, { cfg });
    return `B 站搜索接口有反爬，以下是搜索页正文（可能不完整）：\n${page}`;
  }

  if (kind === 'ranking') {
    const rid = params.rid ?? 0;
    const raw = await fetchAsText(`https://api.bilibili.com/x/web-interface/ranking/v2?rid=${rid}&type=all`, common);
    return feed('排行榜', raw, limit, cfg);
  }

  const raw = await fetchAsText(`https://api.bilibili.com/x/web-interface/popular?ps=${limit}&pn=1`, common);
  return feed('热门视频', raw, limit, cfg);
}

/** 热门/排行榜共用：解析并精简成列表。 */
function feed(label: string, raw: string, limit: number, cfg: WebSection): string {
  let j: any;
  try {
    j = JSON.parse(raw);
  } catch {
    return `取不到 B 站 ${label}（返回不是 JSON）；可能是网络或反爬。原始返回前几行：\n${clip(raw, 400)}`;
  }
  if (j.code !== 0) return `B 站 ${label} 接口返回错误：code=${j.code} ${j.message ?? ''}`;
  const list: any[] = Array.isArray(j?.data?.list) ? j.data.list : [];
  if (list.length === 0) return `B 站 ${label} 这次没取到内容。`;
  const shown = Math.min(list.length, limit);
  const head =
    list.length > shown
      ? `B 站${label}，共 ${list.length} 条，列出前 ${shown} 条：\n`
      : `B 站${label}，共 ${list.length} 条：\n`;
  return clip(head + list.slice(0, shown).map((v, i) => line(v, i + 1)).join('\n'), cfg.maxChars);
}

/** 单个视频详情。 */
function detail(raw: string): string {
  let j: any;
  try {
    j = JSON.parse(raw);
  } catch {
    return '取不到这个视频（返回不是 JSON）。';
  }
  if (j.code !== 0) return `视频接口返回错误：code=${j.code} ${j.message ?? ''}`;
  const v = j.data;
  const stat = v?.stat ?? {};
  const pub = v?.pubdate ? new Date(v.pubdate * 1000).toLocaleString('zh-CN', { hour12: false }) : '—';
  return [
    `标题：${v?.title ?? '—'}`,
    `UP：${v?.owner?.name ?? '—'}　分区：${v?.tname_v2 || v?.tname || '—'}`,
    `播放 ${num(stat.view)}　弹幕 ${num(stat.danmaku)}　点赞 ${num(stat.like)}　投币 ${num(stat.coin)}　收藏 ${num(
      stat.favorite,
    )}　分享 ${num(stat.share)}`,
    `时长 ${mmss(v?.duration)}　发布 ${pub}`,
    `链接：https://www.bilibili.com/video/${v?.bvid ?? ''}`,
    '',
    `简介：${clip(String(v?.desc ?? '（无）'), 900)}`,
  ].join('\n');
}
