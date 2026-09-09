'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SiteWordmark } from '@/components/SiteWordmark';
import type { Bag, ConsumeLog } from '@/lib/types';
import { toJP } from '@/lib/utils/coffee';
import { db } from '@/lib/db';
import { withUpdatedBagMetadata } from '@/lib/utils/bag-metadata';

interface ExtractionDetailPageProps {
  bagId: string;
  logId: string;
}

export default function ExtractionDetailPage({ bagId, logId }: ExtractionDetailPageProps) {
  const router = useRouter();
  const [bag, setBag] = useState<Bag | null>(null);
  const [log, setLog] = useState<ConsumeLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const foundBag = await db.bags.get(bagId);
        if (foundBag) {
          setBag(foundBag);
          const foundLog = foundBag.consumeLogs.find(l => l.id === logId);
          if (foundLog) {
            setLog(foundLog);
          }
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [bagId, logId]);

  const handleDelete = async () => {
    if (!bag || !log || deleting) return;

    try {
      setDeleting(true);
      const updatedBag: Bag = {
        ...bag,
        consumeLogs: bag.consumeLogs.filter(l => l.id !== log.id),
        remaining_g: log.reducesStock
          ? Math.min(bag.bagWeight_g, bag.remaining_g + log.grams)
          : bag.remaining_g,
      };
      const versioned = withUpdatedBagMetadata(updatedBag);
      await db.bags.put(versioned);
      router.push(`/bags/${bag.id}`);
    } catch (error) {
      console.error('Failed to delete log:', error);
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <main id="main-content" tabIndex={-1} className="page-shell">
        <div className="page-shell__content">
          <div role="status" className="py-16 text-center text-muted-foreground">読み込み中...</div>
        </div>
      </main>
    );
  }

  if (!bag || !log) {
    return (
      <main id="main-content" tabIndex={-1} className="page-shell">
        <div className="page-shell__content">
          <div className="flex flex-col items-center gap-4 rounded-[var(--radius-md)] border border-border/70 bg-white/70 px-8 py-14 text-center shadow-[0_24px_60px_-36px_rgba(0,0,0,0.1)]">
            <p className="text-sm text-muted-foreground">抽出記録が見つかりません</p>
            <Button size="lg" className="tracking-[0.12em]" onClick={() => router.push('/')}>ホームに戻る</Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="page-shell">
      <div className="page-shell__content flex flex-col gap-12">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="tracking-[0.12em]"
              onClick={() => router.push(`/bags/${bag.id}`)}
            >
              <ArrowLeft className="h-4 w-4" />
              戻る
            </Button>
            <SiteWordmark />
          </div>
        </header>

        <main id="main-content" tabIndex={-1} className="space-y-8">
          <section>
            <h1 className="text-[20px] sm:text-[22px] font-semibold leading-tight">抽出記録</h1>
            <p className="text-[12px] text-muted-foreground mt-1">{bag.name}</p>
          </section>

          {/* Rating and Date */}
          <section>
            <Card className="py-0 rounded-[var(--radius-md)] bg-white/80 border border-border/70 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="text-[14px] text-muted-foreground">{toJP(log.date)}</div>
                  {log.rating && (
                    <div className="text-[18px] text-foreground">
                      {'★'.repeat(log.rating)}{'☆'.repeat(5 - log.rating)}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Main Parameters */}
          <section>
            <Card className="py-0 rounded-[var(--radius-md)] bg-white/80 border border-border/70 shadow-sm">
              <CardContent className="p-5 space-y-4">
                <h2 className="text-[15px] font-semibold">抽出パラメータ</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[11px] text-muted-foreground mb-1">豆量</div>
                    <div className="text-[16px] font-medium">{log.grams}g</div>
                  </div>
                  {log.dripper && (
                    <div>
                      <div className="text-[11px] text-muted-foreground mb-1">ドリッパー</div>
                      <div className="text-[16px] font-medium">{log.dripper}</div>
                    </div>
                  )}
                  {log.grinder && (
                    <div>
                      <div className="text-[11px] text-muted-foreground mb-1">グラインダー</div>
                      <div className="text-[16px] font-medium">{log.grinder}</div>
                    </div>
                  )}
                  {log.grindSize && (
                    <div>
                      <div className="text-[11px] text-muted-foreground mb-1">挽き目</div>
                      <div className="text-[16px] font-medium">{log.grindSize}</div>
                    </div>
                  )}
                  {log.waterTemp && (
                    <div>
                      <div className="text-[11px] text-muted-foreground mb-1">湯温</div>
                      <div className="text-[16px] font-medium">{log.waterTemp}℃</div>
                    </div>
                  )}
                  {log.waterAmount && (
                    <div>
                      <div className="text-[11px] text-muted-foreground mb-1">湯量</div>
                      <div className="text-[16px] font-medium">{log.waterAmount}g</div>
                    </div>
                  )}
                  {log.bloomTime && (
                    <div>
                      <div className="text-[11px] text-muted-foreground mb-1">蒸らし時間</div>
                      <div className="text-[16px] font-medium">{log.bloomTime}秒</div>
                    </div>
                  )}
                  {log.brewTime && (
                    <div>
                      <div className="text-[11px] text-muted-foreground mb-1">抽出時間</div>
                      <div className="text-[16px] font-medium">{log.brewTime}</div>
                    </div>
                  )}
                  {log.yieldAmount && (
                    <div>
                      <div className="text-[11px] text-muted-foreground mb-1">抽出量</div>
                      <div className="text-[16px] font-medium">{log.yieldAmount}ml</div>
                    </div>
                  )}
                </div>
                {!log.reducesStock && (
                  <div className="text-[12px] text-muted-foreground pt-2 border-t border-border/50">
                    この記録は在庫を減算していません
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Notes */}
          {log.notes && (
            <section>
              <Card className="py-0 rounded-[var(--radius-md)] bg-white/80 border border-border/70 shadow-sm">
                <CardContent className="p-5 space-y-2">
                  <h2 className="text-[15px] font-semibold">メモ</h2>
                  <p className="text-[14px] text-foreground leading-relaxed whitespace-pre-wrap">
                    {log.notes}
                  </p>
                </CardContent>
              </Card>
            </section>
          )}

          {/* Actions */}
          <section>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="flex-1 rounded-[var(--radius-sm)] border border-border/70 bg-white/80 text-foreground"
                onClick={() => router.push(`/bags/${bag.id}/extraction/${log.id}/edit`)}
              >
                <Edit2 className="w-4 h-4 mr-2" />
                編集
              </Button>
              <Button
                variant="outline"
                className="rounded-[var(--radius-sm)] border border-destructive/50 bg-white/80 text-destructive hover:bg-destructive/10"
                onClick={handleDelete}
                disabled={deleting}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {deleting ? '削除中...' : '削除'}
              </Button>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
