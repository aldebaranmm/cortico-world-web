/** Package entry: the default export is the WorldDefinition. */
import type { WorldDefinition, WorldDescribe } from 'cortico/world.ts';
import { WEB_DEFAULTS, WEB_ID, type WebSection } from './config.ts';
import { createWebWorld } from './world.ts';

const DESCRIBE: WorldDescribe = {
  tools: [
    {
      name: 'web_fetch',
      tags: ['read'],
      description: 'Reads a web page or an API as text, without taking a screenshot.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'A full http/https address.' },
          maxChars: { type: 'integer', minimum: 200, maximum: 60000 },
        },
        required: ['url'],
      },
      summary: {
        zh: '把一个网页或接口取成文字，不用截图。',
        en: 'Reads a web page or an API as text, no screenshot needed.',
      },
    },
    {
      name: 'web_bilibili',
      tags: ['read'],
      description:
        'Fetches Bilibili content in one call: popular feed, ranking, one video\'s detail, or a keyword search. No login needed.',
      parameters: {
        type: 'object',
        properties: {
          kind: { type: 'string', enum: ['popular', 'ranking', 'view', 'search'] },
          keyword: { type: 'string' },
          bvid: { type: 'string' },
          limit: { type: 'integer', minimum: 1, maximum: 50 },
          rid: { type: 'integer' },
        },
        required: ['kind'],
      },
      summary: {
        zh: '一次取回 B 站热门、排行、视频详情或搜索结果。',
        en: 'Fetches Bilibili popular, ranking, video detail or search results in one call.',
      },
    },
  ],
};

export const WEB: WorldDefinition<WebSection> = {
  id: WEB_ID,
  label: '网页',
  defaults: () => structuredClone(WEB_DEFAULTS),
  create: (ctx) => createWebWorld(ctx),
  describe: DESCRIBE,
};

export default WEB;
