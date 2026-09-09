'use client';
import React, { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import type { Bag } from '@/lib/types';
import { formatJPY } from '@/lib/utils/coffee';
import { getValidImageUrl } from '@/lib/utils/image';
import { db } from '@/lib/db';

// Helper functions for history criteria (pure functions, defined outside component)
const sumConsumedLogs = (b: Bag) => (b.consumeLogs||[]).filter((l)=>l.reducesStock).reduce((s:number,l)=>s+l.grams,0);

const getRegisteredTotal = (bag: Bag) => {
  if (bag.isSet) {
    return bag.setInfo?.totalWeight_g ?? 0;
  }
  return bag.bagWeight_g ?? 0;
};

const meetsHistoryCriteria = (bag: Bag) => {
  if (bag.isSubscriptionTemplate || bag.isSet) return false;
  const totalRegistered = getRegisteredTotal(bag);
  if (!totalRegistered || totalRegistered <= 0) return false;
  if ((bag.remaining_g ?? 0) > 0) return false;
  if (sumConsumedLogs(bag) < totalRegistered) return false;
  return true;
};

export default function HistoryPage(){
  const router = useRouter();
  const [bags, setBags] = useState<Bag[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<'purchase-desc'|'purchase-asc'>('purchase-desc');
  const [imageUrls, setImageUrls] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    const loadBags = async () => {
      try {
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
  }, []);

  const historyEligibleBags = useMemo(()=>bags.filter(meetsHistoryCriteria),[bags]);
  const lastConsumeDate = (b: Bag) => (b.consumeLogs||[]).map((l)=>l.date).sort((a:string,b:string)=> (b>a?1:-1))[0];

  const sorted = useMemo(()=>{
    const arr = [...historyEligibleBags];
    arr.sort((a:Bag,b:Bag)=>{
      if (sort==='purchase-asc') return new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime();
      if (sort==='purchase-desc') return new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime();
      return 0;
    });
    return arr;
  },[historyEligibleBags, sort]);

  return (
    <div className="page-shell max-w-full overflow-x-hidden">
      <div className="page-shell__content flex flex-col gap-8 sm:gap-12 max-w-full">
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="rounded-[var(--radius-sm)] border border-border/70 bg-white/80 text-foreground px-3 py-2 flex items-center gap-2 hover:opacity-90"
              onClick={() => router.push('/')}
            >
              <ArrowLeft className="w-4 h-4" />
              戻る
            </Button>
            <div className="tracking-tight text-lg sm:text-xl font-semibold">Coffee Ledger</div>
          </div>
        </header>

        <main id="main-content" tabIndex={-1} className="space-y-6 sm:space-y-8">
          {loading ? (
            <div role="status" className="text-center py-12 text-muted-foreground">読み込み中...</div>
          ) : (
            <section>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                <h1 className="text-[18px] sm:text-[20px] font-semibold tracking-tight">飲み切った豆</h1>
                <select aria-label="購入日の並び順" className="text-[12px] sm:text-[13px] border border-border/70 bg-white/80 rounded-[var(--radius-sm)] px-2 py-1 w-full sm:w-auto" value={sort} onChange={(e)=>setSort(e.target.value as 'purchase-desc'|'purchase-asc')}>
                  <option value="purchase-desc">購入日（新しい順）</option>
                  <option value="purchase-asc">購入日（古い順）</option>
                </select>
              </div>
              <p className="text-[12px] text-muted-foreground mb-3">※ 総量が登録され、全量消費済みの袋を表示。</p>

              <div className="space-y-4">
                {sorted.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    飲み切った豆はありません
                  </div>
                ) : (
                  sorted.map((b: Bag)=> {
                    const processLabel = b.process?.trim() ? b.process : '未選択';
                    return (
                      <Card key={b.id} className="py-0 rounded-[var(--radius-md)] bg-white/80 border border-border/70 shadow-sm">
                        <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-5">
                        <Image
                          src={imageUrls.get(b.id) || '/default-coffee-bean.svg'}
                          alt={`${b.name}の画像`}
                          width={92}
                          height={92}
                          className="w-full sm:w-[92px] h-[120px] sm:h-[92px] object-cover rounded-[4px] border border-border/70"
                          style={{
                            imageRendering: '-webkit-optimize-contrast' as React.CSSProperties['imageRendering'],
                            transform: 'translateZ(0)',
                          }}
                        />
                        <div className="flex-1 min-w-0 w-full">
                          <div className="font-semibold text-[14px] sm:text-[16px] leading-snug truncate">{b.name}</div>
                          <div className="text-[12px] sm:text-[13px] text-muted-foreground">{b.roaster}{b.variety ? ` / ${b.variety}` : ''} / {processLabel} / {b.purchaseDate}（購入）</div>
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-2">
                            <span className="text-[11px] sm:text-[13px]">{typeof b.priceJPY==='number' ? `${formatJPY(b.priceJPY)} ・ ` : ''}購入 {b.bagWeight_g}g ・ 累計消費（ログ） {sumConsumedLogs(b)}g{lastConsumeDate(b) ? ` ・ 最終記録 ${new Date(lastConsumeDate(b)!).toLocaleDateString('ja-JP')}` : ''}</span>
                            <Button variant="outline" aria-label={`${b.name}の詳細`} className="rounded-[var(--radius-sm)] border border-border/70 bg-white/80 text-foreground px-3 py-2 w-full sm:w-auto" onClick={()=>router.push(`/bags/${b.id}`)}>詳細</Button>
                          </div>
                        </div>
                      </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
