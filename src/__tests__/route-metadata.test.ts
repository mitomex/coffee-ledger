import type { Metadata } from 'next';
import * as layout from '@/app/layout';
import * as home from '@/app/page';
import * as history from '@/app/history/page';
import * as newBag from '@/app/bags/new/page';
import * as bagDetail from '@/app/bags/[id]/page';
import * as bagEdit from '@/app/bags/[id]/edit/page';
import * as record from '@/app/bags/[id]/record/page';
import * as setAdd from '@/app/bags/[id]/set/add/page';
import * as extraction from '@/app/bags/[id]/extraction/[logId]/page';
import * as extractionEdit from '@/app/bags/[id]/extraction/[logId]/edit/page';

type RouteModule = { metadata?: Metadata };

const routes: Array<[string, RouteModule]> = [
  ['/', home],
  ['/history', history],
  ['/bags/new', newBag],
  ['/bags/[id]', bagDetail],
  ['/bags/[id]/edit', bagEdit],
  ['/bags/[id]/record', record],
  ['/bags/[id]/set/add', setAdd],
  ['/bags/[id]/extraction/[logId]', extraction],
  ['/bags/[id]/extraction/[logId]/edit', extractionEdit],
];

const titleOf = (mod: RouteModule) => mod.metadata?.title;

describe('page titles', () => {
  it('gives the document title a per-page template so each route is named', () => {
    const title = layout.metadata.title as { default: string; template: string };
    expect(title.default).toBe('Coffee Ledger');
    expect(title.template).toBe('%s | Coffee Ledger');
  });

  it.each(routes)('%s names itself', (_path, mod) => {
    const title = titleOf(mod);
    expect(typeof title).toBe('string');
    expect(title).not.toBe('');
  });

  it('spells out the app name on the home route, which the template cannot reach', () => {
    expect(titleOf(home)).toBe('在庫一覧 | Coffee Ledger');
  });

  it('gives every route a distinct title', () => {
    const titles = routes.map(([, mod]) => titleOf(mod));
    expect(new Set(titles).size).toBe(routes.length);
  });
});
