'use client';
import React, { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Modal, ModalTitle } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Plus, SlidersHorizontal, X } from 'lucide-react';
import type { Bag } from '@/lib/types';
import { resolveDose, cupsLeft, dateLabel, isArchived } from '@/lib/utils/coffee';
import { getValidImageUrl } from '@/lib/utils/image';
import { db } from '@/lib/db';
import { removeMethodFieldFromConsumeLogs } from '@/lib/migrations/remove-method-field';
import { removeFreezePortionsFromBags } from '@/lib/migrations/remove-freeze-portions';
import { removePeakFieldFromBags } from '@/lib/migrations/remove-peak-field';

const APP_DOSE_DEFAULT = 14;
const PROCESS_ORDER = ['Washed','Honey','Natural','Anaerobic'] as const;

const normalizeProcess = (value?: string | null) => (value?.trim() ?? '');

const getProcessRank = (process: string) => {
  const normalized = normalizeProcess(process);
  const index = PROCESS_ORDER.indexOf(normalized as typeof PROCESS_ORDER[number]);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
};

export default function HomePage(){
  const router = useRouter();
  const appDose = APP_DOSE_DEFAULT;
  const [sortKey, setSortKey] = useState<'date-asc'|'date-desc'|'process'|'remain-asc'|'remain-desc'>('date-asc');
  const [processFilter, setProcessFilter] = useState<'all' | string>('all');
  const [showParentBags, setShowParentBags] = useState(false);
  const [bags, setBags] = useState<Bag[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageUrls, setImageUrls] = useState<Map<string, string>>(new Map());
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  
  useEffect(() => {
    const loadBags = async () => {
      try {
        // Run migrations to remove deprecated fields
        await removeMethodFieldFromConsumeLogs();
        await removeFreezePortionsFromBags();
        await removePeakFieldFromBags();

        const allBags = await db.bags.toArray();
        setBags(allBags);

        // 各bagの画像URLを取得
        const urlMap = new Map<string, string>();
        await Promise.all(
          allBags.map(async (bag) => {
            const imageUrl = await getValidImageUrl(bag.imageId);
            urlMap.set(bag.id, imageUrl);
          })
        );
        setImageUrls(urlMap);
      } catch (error) {
        console.error('Failed to load bags:', error);
      } finally {
        setLoading(false);
      }
    };
    loadBags();
    window.addEventListener('coffee-ledger:subscriptions-updated', loadBags);
    return () => window.removeEventListener('coffee-ledger:subscriptions-updated', loadBags);
  }, []);
  
  const activeBags = useMemo(() => {
    // 親Bagはアーカイブ判定から除外（子Bagで在庫管理するため）
    const filtered = bags.filter(b => !b.isSubscriptionTemplate && (b.isSet || !isArchived(b)));
    if (showParentBags) {
      return filtered;
    }
    // 子Bagを除外（親Bagのみ表示）
    return filtered.filter(b => !b.parentBagId);
  }, [bags, showParentBags]);

  const processOptions = useMemo(()=>{
    const unique = Array.from(new Set(activeBags.map(b=>normalizeProcess(b.process))));
    return unique.sort((a,b)=>{
      const rankDiff = getProcessRank(a) - getProcessRank(b);
      if (rankDiff !== 0) return rankDiff;
      return a.localeCompare(b);
    });
  },[activeBags]);

  const filteredActiveBags = useMemo(()=>{
    if (processFilter === 'all') return activeBags;
    return activeBags.filter(b=>normalizeProcess(b.process) === processFilter);
  },[activeBags, processFilter]);

  const sortedActiveBags = useMemo(()=>{
    const arr = [...filteredActiveBags];
    const getDate = (b: Bag)=> new Date(b.roastDate || b.purchaseDate).getTime();
    const getRemainingCups = (b: Bag)=> cupsLeft(b.remaining_g, resolveDose(appDose, b.roaster, b.bagDose_g));
    arr.sort((a,b)=>{
      if (sortKey==='date-asc') return getDate(a)-getDate(b);
      if (sortKey==='date-desc') return getDate(b)-getDate(a);
      if (sortKey==='process') return getProcessRank(normalizeProcess(a.process))-getProcessRank(normalizeProcess(b.process));
      if (sortKey==='remain-asc') return getRemainingCups(a)-getRemainingCups(b);
      if (sortKey==='remain-desc') return getRemainingCups(b)-getRemainingCups(a);
      return 0;
    });
    return arr;
  },[filteredActiveBags, sortKey, appDose]);

  const inventorySummary = useMemo(()=>{
    const totalGrams = sortedActiveBags.reduce((sum, bag)=>sum + (bag.remaining_g ?? 0), 0);
    return {
      totalCount: sortedActiveBags.length,
      totalGrams,
    };
  },[sortedActiveBags]);


  return (
    <div className="page-shell max-w-full overflow-x-hidden">
      <div className="page-shell__content flex flex-col gap-8 sm:gap-12 max-w-full">
        <header className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-[34px] font-semibold leading-[1.25] tracking-[0.08em]">
              Coffee Ledger
            </h1>
          </div>
        </header>

        <main id="main-content" tabIndex={-1} className="space-y-12 max-w-full overflow-x-hidden">
          {!loading && activeBags.length === 0 && <Link href="/history" className="underline">飲み切った豆</Link>}
          {loading ? (
            <div role="status" className="py-16 text-center text-muted-foreground">読み込み中...</div>
          ) : activeBags.length === 0 ? (
            <div className="flex flex-col items-center gap-6 rounded-[var(--radius-md)] border border-border/70 bg-white/70 px-10 py-16 text-center shadow-[0_24px_60px_-36px_rgba(0,0,0,0.1)]">
              <p className="text-sm leading-relaxed text-muted-foreground">
                まだ登録されたコーヒー豆がありません。
                <br />
                シンプルなカードに、初めての豆の情報を記録しましょう。
              </p>
              <Button size="lg" className="tracking-[0.12em]" onClick={()=>router.push('/bags/new')}>
                最初の豆を登録
              </Button>
            </div>
          ) : (
            <>
              {/* 在庫一覧 */}
              <section className="space-y-5 max-w-full">
                <div className="flex flex-col gap-3 max-w-full">
                  {/* 1段目 */}
                  <div className="flex items-center justify-between gap-3 max-w-full">
                    <h2 className="text-lg font-semibold tracking-[0.12em] uppercase whitespace-nowrap">
                      在庫一覧
                    </h2>
                    {/* SP: フィルターボタン */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFilterModalOpen(true)}
                      className="h-8 px-3 text-[12px] tracking-[0.08em] sm:hidden"
                    >
                      <SlidersHorizontal className="h-4 w-4" />
                      フィルター
                    </Button>
                    {/* PC: フィルター類 */}
                    <div className="hidden sm:flex sm:flex-row gap-3 sm:items-center flex-wrap max-w-full">
                      <label className="flex items-center gap-2 text-[12px] text-muted-foreground whitespace-nowrap cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showParentBags}
                          onChange={(e) => setShowParentBags(e.target.checked)}
                          className="rounded border-border/70"
                        />
                        セット内容も表示
                      </label>
                      <select
                        aria-label="プロセスで絞り込む"
                        className="w-auto max-w-[160px] rounded-[var(--radius-sm)] border border-border/70 bg-white/80 px-4 py-2 text-[12px] tracking-[0.04em] text-foreground shadow-sm outline-none transition-colors focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary/25"
                        value={processFilter}
                        onChange={(e)=>setProcessFilter(e.target.value)}
                      >
                        <option value="all">すべてのプロセス</option>
                        {processOptions.map((option)=>(
                          <option key={option || 'process-unselected'} value={option}>{option || '未選択'}</option>
                        ))}
                      </select>
                      <select
                        aria-label="並び順"
                        className="w-auto max-w-[160px] rounded-[var(--radius-sm)] border border-border/70 bg-white/80 px-4 py-2 text-[12px] tracking-[0.04em] text-foreground shadow-sm outline-none transition-colors focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary/25"
                        value={sortKey}
                        onChange={(e)=>setSortKey(e.target.value as typeof sortKey)}
                      >
                        <option value="date-asc">日付（古い順）</option>
                        <option value="date-desc">日付（新しい順）</option>
                        <option value="process">プロセス（Washed→Honey→Natural→Anaerobic）</option>
                        <option value="remain-asc">残り杯数（少ない順）</option>
                        <option value="remain-desc">残り杯数（多い順）</option>
                      </select>
                    </div>
                  </div>

                  {/* 2段目: 集計+ボタン */}
                  <div className="flex items-center gap-3 max-w-full flex-wrap">
                    <div role="status" aria-label="在庫の集計" className="flex items-center gap-3 text-[11px] sm:text-[12px] tracking-[0.08em] text-muted-foreground">
                      <span className="whitespace-nowrap">総件数 {inventorySummary.totalCount}件</span>
                      <span className="whitespace-nowrap">総グラム数 {inventorySummary.totalGrams.toLocaleString('ja-JP')}g</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="h-8 px-3 text-[12px] tracking-[0.08em] whitespace-nowrap"
                    >
                      <Link href="/history">飲み切った豆</Link>
                    </Button>
                  </div>
                </div>
                <div className="space-y-4 max-w-full">
                  {sortedActiveBags.map((b: Bag)=>{
                    const dose = resolveDose(appDose, b.roaster, b.bagDose_g);
                    const processLabel = normalizeProcess(b.process) || '未選択';

                    // 親Bagの場合、子Bagを取得して残量を計算
                    const childBags = b.isSet && b.childBagIds
                      ? bags.filter(bag => b.childBagIds?.includes(bag.id))
                      : [];

                    const displayRemaining = b.isSet
                      ? childBags.reduce((sum, child) => sum + child.remaining_g, 0)
                      : b.remaining_g;

                    const cups = cupsLeft(displayRemaining, dose);

                    // 子Bagの場合、親Bagを取得
                    const parentBag = b.parentBagId
                      ? bags.find(bag => bag.id === b.parentBagId)
                      : null;

                    return (
                      <Card
                        key={b.id}
                        className="cursor-pointer transition-transform duration-300 hover:-translate-y-[2px] hover:shadow-lg overflow-hidden max-w-full"
                      >
                        <Link href={`/bags/${b.id}`} className="block rounded-[var(--radius-md)] focus-visible:outline-2 focus-visible:outline-offset-2">
                        <CardContent className="flex gap-3 items-start min-w-0 p-3">
                          <div className="w-20 h-20 flex-shrink-0">
                            <div className="overflow-hidden rounded-[var(--radius-sm)] border border-border/60 bg-white/80 w-full h-full">
                              <Image
                                src={imageUrls.get(b.id) || '/default-coffee-bean.svg'}
                                alt={`${b.name}の画像`}
                                width={80}
                                height={80}
                                className="w-full h-full object-cover object-center"
                                style={{
                                  imageRendering: '-webkit-optimize-contrast' as React.CSSProperties['imageRendering'],
                                  transform: 'translateZ(0)',
                                }}
                              />
                            </div>
                          </div>
                          <div className="flex-1 space-y-2 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap min-w-0">
                              <h3 className="text-[15px] font-semibold tracking-[0.02em] leading-snug break-words">{b.name}</h3>
                              {b.isSet && (
                                <>
                                  <span className="inline-flex items-center rounded-[var(--radius-sm)] border border-border/60 bg-primary/10 px-2 py-0.5 text-[10px] font-medium tracking-[0.04em] text-primary flex-shrink-0 sm:hidden">
                                    セット
                                  </span>
                                  <span className="hidden sm:inline-flex items-center rounded-[var(--radius-sm)] border border-border/60 bg-primary/10 px-2 py-0.5 text-[10px] font-medium tracking-[0.04em] text-primary flex-shrink-0">
                                    セット
                                  </span>
                                </>
                              )}
                              {b.isSubscriptionTemplate && (
                                <span className="inline-flex items-center rounded-[var(--radius-sm)] border border-border/60 bg-primary/10 px-2 py-0.5 text-[10px] font-medium tracking-[0.04em] text-primary flex-shrink-0">
                                  🔄 サブスク
                                </span>
                              )}
                            </div>
                            {parentBag && (
                              <p className="text-[10px] text-muted-foreground truncate">
                                {parentBag.name} のセット内容
                              </p>
                            )}
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                              {b.roaster}
                              {!b.isSet && b.variety && ` / ${b.variety}`}
                              {!b.isSet && (processLabel === '未選択' ? ` / プロセス：${processLabel}` : ` / ${processLabel}`)}
                              {!b.isSet && b.country && ` / ${b.country}`}
                              {!b.isSet && b.farm && ` / ${b.farm}`}
                            </p>
                            <p className="text-[12px] font-medium text-muted-foreground truncate">
                              {dateLabel(b)}
                            </p>
                            {b.isSet && childBags.length > 0 && (
                              <div className="rounded-[var(--radius-sm)] border border-border/60 bg-white/60 px-2 py-1.5">
                                <p className="mb-1 text-[10px] font-medium text-muted-foreground">セット内容</p>
                                <ul className="space-y-0.5 text-[11px]">
                                  {childBags.map(child => (
                                    <li key={child.id}>• {child.name}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            <div className="text-[11px] text-foreground font-medium">
                              {b.isSet ? (
                                childBags.length > 0 ? (
                                  <span>残 {displayRemaining}g（あと {cups}杯）・{dose}g/杯</span>
                                ) : (
                                  <span className="text-muted-foreground">未設定</span>
                                )
                              ) : (
                                <span>残 {displayRemaining}g（あと {cups}杯）・{dose}g/杯</span>
                              )}
                            </div>
                          </div>
                        </CardContent>
                        </Link>
                      </Card>
                    );
                  })}
                </div>
              </section>
            </>
          )}
          {!loading && bags.some(b => b.isSubscriptionTemplate) && (
            <section className="space-y-3" aria-labelledby="subscription-settings-heading">
              <h2 id="subscription-settings-heading" className="text-lg font-semibold">定期購入設定</h2>
              <p className="text-sm text-muted-foreground">購入周期の設定です。在庫の件数・残量には含めません。</p>
              <ul className="space-y-2">
                {bags.filter(b => b.isSubscriptionTemplate).map(template => (
                  <li key={template.id}>
                    <Link href={`/bags/${template.id}`} className="block rounded-md border border-border p-4 hover:bg-accent focus-visible:outline-2">
                      {template.name} · {template.subscriptionInfo?.isActive ? '有効' : '停止中'}
                      {template.subscriptionInfo && ` · 毎月${template.subscriptionInfo.dayOfMonth}日`}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </main>
      </div>

      {/* フィルターモーダル（SP時のみ） */}
      <Modal open={filterModalOpen} onClose={() => setFilterModalOpen(false)}
        overlayClassName="items-end sm:items-center p-0 sm:p-4"
        className="w-full sm:w-auto sm:min-w-[400px] rounded-b-none sm:rounded-b-[var(--radius-md)]">
            <div className="flex items-center justify-between p-4 border-b border-border/70">
              <ModalTitle className="text-[16px] font-semibold tracking-[0.08em]">フィルター</ModalTitle>
              <button
                onClick={() => setFilterModalOpen(false)}
                aria-label="フィルターを閉じる"
                className="rounded-full p-1.5 hover:bg-muted/50 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <label className="flex items-center gap-2 text-[13px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={showParentBags}
                  onChange={(e) => setShowParentBags(e.target.checked)}
                  className="rounded border-border/70"
                />
                セット内容も表示
              </label>
              <div className="space-y-2">
                <label htmlFor="mobile-process" className="block text-[12px] text-muted-foreground">プロセス</label>
                <select
                  id="mobile-process"
                  aria-label="プロセスで絞り込む"
                  className="w-full rounded-[var(--radius-sm)] border border-border/70 bg-white/80 px-4 py-2.5 text-[13px] tracking-[0.04em] text-foreground shadow-sm outline-none transition-colors focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary/25"
                  value={processFilter}
                  onChange={(e)=>setProcessFilter(e.target.value)}
                >
                  <option value="all">すべてのプロセス</option>
                  {processOptions.map((option)=>(
                    <option key={option || 'process-unselected'} value={option}>{option || '未選択'}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor="mobile-sort" className="block text-[12px] text-muted-foreground">並び順</label>
                <select
                  id="mobile-sort"
                  className="w-full rounded-[var(--radius-sm)] border border-border/70 bg-white/80 px-4 py-2.5 text-[13px] tracking-[0.04em] text-foreground shadow-sm outline-none transition-colors focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary/25"
                  value={sortKey}
                  onChange={(e)=>setSortKey(e.target.value as typeof sortKey)}
                >
                  <option value="date-asc">日付（古い順）</option>
                  <option value="date-desc">日付（新しい順）</option>
                  <option value="process">プロセス（Washed→Honey→Natural→Anaerobic）</option>
                  <option value="remain-asc">残り杯数（少ない順）</option>
                  <option value="remain-desc">残り杯数（多い順）</option>
                </select>
              </div>
              <Button
                className="w-full"
                onClick={() => setFilterModalOpen(false)}
              >
                適用
              </Button>
            </div>
      </Modal>

      <Button
        size="lg"
        className="fixed bottom-6 right-6 shadow-xl"
        onClick={()=>router.push('/bags/new')}
      >
        <Plus className="h-4 w-4" /> 新規
      </Button>
    </div>
  );
}
