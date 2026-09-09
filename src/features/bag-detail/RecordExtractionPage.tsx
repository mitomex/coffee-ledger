'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SiteWordmark } from '@/components/SiteWordmark';
import type { Bag, ConsumeLog } from '@/lib/types';
import { resolveDose, todayYMD } from '@/lib/utils/coffee';
import { db } from '@/lib/db';
import { withUpdatedBagMetadata } from '@/lib/utils/bag-metadata';

const APP_DOSE_DEFAULT = 14;

interface RecordExtractionPageProps {
  bagId: string;
}

export default function RecordExtractionPage({ bagId }: RecordExtractionPageProps) {
  const router = useRouter();
  const [bag, setBag] = useState<Bag | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logDose, setLogDose] = useState<number>(APP_DOSE_DEFAULT);
  const [logGrindSize, setLogGrindSize] = useState<string>('');
  const [logWaterTemp, setLogWaterTemp] = useState<string>('');
  const [logWaterAmount, setLogWaterAmount] = useState<string>('');
  const [logNotes, setLogNotes] = useState('');
  const [logAlsoConsume, setLogAlsoConsume] = useState(true);
  // 拡張抽出パラメータ
  const [logDripper, setLogDripper] = useState<string>('');
  const [logGrinder, setLogGrinder] = useState<string>('');
  const [logBrewTime, setLogBrewTime] = useState<string>('');
  const [logYieldAmount, setLogYieldAmount] = useState<string>('');
  const [logBloomTime, setLogBloomTime] = useState<string>('');
  const [logRating, setLogRating] = useState<string>('');

  useEffect(() => {
    const loadBag = async () => {
      try {
        const foundBag = await db.bags.get(bagId);
        if (foundBag) {
          setBag(foundBag);
          const defaultDose = resolveDose(APP_DOSE_DEFAULT, foundBag.roaster, foundBag.bagDose_g);
          setLogDose(defaultDose);
        }
      } catch (error) {
        console.error('Failed to load bag:', error);
      } finally {
        setLoading(false);
      }
    };

    loadBag();
  }, [bagId]);

  const updateBag = async (updatedBag: Bag) => {
    try {
      const versioned = withUpdatedBagMetadata(updatedBag);
      await db.bags.put(versioned);
      setBag(versioned);
    } catch (error) {
      console.error('Failed to update bag:', error);
      throw error;
    }
  };

  const handleSave = async () => {
    if (!bag || bag.isSet || bag.isSubscriptionTemplate || saving) return;
    const rawGrams = Math.max(1, Math.floor(Number(logDose) || 0));
    // 在庫を減らす場合は残量を超えないよう制限
    const grams = logAlsoConsume ? Math.min(rawGrams, bag.remaining_g) : rawGrams;
    const consumeLog: ConsumeLog = {
      id: `c${Date.now()}`,
      date: todayYMD(),
      grams,
      grindSize: logGrindSize || undefined,
      waterTemp: logWaterTemp ? Number(logWaterTemp) : undefined,
      waterAmount: logWaterAmount ? Number(logWaterAmount) : undefined,
      notes: logNotes || undefined,
      reducesStock: logAlsoConsume,
      // 拡張パラメータ
      dripper: logDripper || undefined,
      grinder: logGrinder || undefined,
      brewTime: logBrewTime || undefined,
      yieldAmount: logYieldAmount ? Number(logYieldAmount) : undefined,
      bloomTime: logBloomTime ? Number(logBloomTime) : undefined,
      rating: logRating ? Number(logRating) : undefined,
    };

    const updatedBag: Bag = {
      ...bag,
      consumeLogs: [...bag.consumeLogs, consumeLog],
      remaining_g: logAlsoConsume ? Math.max(0, bag.remaining_g - grams) : bag.remaining_g,
    };

    try {
      setSaving(true);
      await updateBag(updatedBag);
      router.push(`/bags/${bag.id}`);
    } finally {
      setSaving(false);
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

  if (!bag) {
    return (
      <main id="main-content" tabIndex={-1} className="page-shell">
        <div className="page-shell__content">
          <div className="flex flex-col items-center gap-4 rounded-[var(--radius-md)] border border-border/70 bg-white/70 px-8 py-14 text-center shadow-[0_24px_60px_-36px_rgba(0,0,0,0.1)]">
            <p className="text-sm text-muted-foreground">コーヒー豆が見つかりません</p>
            <Button size="lg" className="tracking-[0.12em]" onClick={() => router.push('/')}>ホームに戻る</Button>
          </div>
        </div>
      </main>
    );
  }

  if (bag.isSet || bag.isSubscriptionTemplate) {
    return (
      <main id="main-content" tabIndex={-1} className="page-shell"><div className="page-shell__content space-y-4">
        <p>抽出記録は個々の豆に追加できます。対象の豆を選んでください。</p>
        <Button onClick={() => router.push(`/bags/${bag.id}`)}>詳細に戻る</Button>
      </div></main>
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
            <h1 className="text-[20px] sm:text-[22px] font-semibold leading-tight">抽出を記録</h1>
            <p className="text-[12px] text-muted-foreground mt-1">バッグ: {bag.name}</p>
          </section>

          <section>
            <Card className="py-0 rounded-[var(--radius-md)] bg-white/80 border border-border/70 shadow-sm">
              <CardContent className="p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="dose-g" className="block text-[12px] text-muted-foreground mb-1">豆量（g）</label>
                    <input
                      id="dose-g"
                      type="number"
                      className="w-full text-[14px] px-3 py-2 rounded-[var(--radius-sm)] border border-border/70 bg-white/80"
                      value={logDose}
                      onChange={(e) => setLogDose(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label htmlFor="grind-size" className="block text-[12px] text-muted-foreground mb-1">挽き目（任意）</label>
                    <input
                      id="grind-size"
                      type="text"
                      className="w-full text-[14px] px-3 py-2 rounded-[var(--radius-sm)] border border-border/70 bg-white/80"
                      value={logGrindSize}
                      onChange={(e) => setLogGrindSize(e.target.value)}
                      placeholder="例：中挽き"
                    />
                  </div>
                  <div>
                    <label htmlFor="water-temp" className="block text-[12px] text-muted-foreground mb-1">湯温（℃・任意）</label>
                    <input
                      id="water-temp"
                      type="number"
                      className="w-full text-[14px] px-3 py-2 rounded-[var(--radius-sm)] border border-border/70 bg-white/80"
                      value={logWaterTemp}
                      onChange={(e) => setLogWaterTemp(e.target.value)}
                      placeholder="例：92"
                    />
                  </div>
                  <div>
                    <label htmlFor="water-amount" className="block text-[12px] text-muted-foreground mb-1">湯量（g・任意）</label>
                    <input
                      id="water-amount"
                      type="number"
                      className="w-full text-[14px] px-3 py-2 rounded-[var(--radius-sm)] border border-border/70 bg-white/80"
                      value={logWaterAmount}
                      onChange={(e) => setLogWaterAmount(e.target.value)}
                      placeholder="例：200"
                    />
                  </div>
                  <div>
                    <label htmlFor="dripper" className="block text-[12px] text-muted-foreground mb-1">ドリッパー（任意）</label>
                    <input
                      id="dripper"
                      type="text"
                      className="w-full text-[14px] px-3 py-2 rounded-[var(--radius-sm)] border border-border/70 bg-white/80"
                      value={logDripper}
                      onChange={(e) => setLogDripper(e.target.value)}
                      placeholder="例：V60、カリタウェーブ"
                    />
                  </div>
                  <div>
                    <label htmlFor="grinder" className="block text-[12px] text-muted-foreground mb-1">グラインダー（任意）</label>
                    <input
                      id="grinder"
                      type="text"
                      className="w-full text-[14px] px-3 py-2 rounded-[var(--radius-sm)] border border-border/70 bg-white/80"
                      value={logGrinder}
                      onChange={(e) => setLogGrinder(e.target.value)}
                      placeholder="例：Comandante C40、1Zpresso"
                    />
                  </div>
                  <div>
                    <label htmlFor="brew-time" className="block text-[12px] text-muted-foreground mb-1">抽出時間（任意）</label>
                    <input
                      id="brew-time"
                      type="text"
                      className="w-full text-[14px] px-3 py-2 rounded-[var(--radius-sm)] border border-border/70 bg-white/80"
                      value={logBrewTime}
                      onChange={(e) => setLogBrewTime(e.target.value)}
                      placeholder="例：2:30"
                    />
                  </div>
                  <div>
                    <label htmlFor="yield-amount" className="block text-[12px] text-muted-foreground mb-1">抽出量（ml・任意）</label>
                    <input
                      id="yield-amount"
                      type="number"
                      className="w-full text-[14px] px-3 py-2 rounded-[var(--radius-sm)] border border-border/70 bg-white/80"
                      value={logYieldAmount}
                      onChange={(e) => setLogYieldAmount(e.target.value)}
                      placeholder="例：180"
                    />
                  </div>
                  <div>
                    <label htmlFor="bloom-time" className="block text-[12px] text-muted-foreground mb-1">蒸らし時間（秒・任意）</label>
                    <input
                      id="bloom-time"
                      type="number"
                      className="w-full text-[14px] px-3 py-2 rounded-[var(--radius-sm)] border border-border/70 bg-white/80"
                      value={logBloomTime}
                      onChange={(e) => setLogBloomTime(e.target.value)}
                      placeholder="例：30"
                    />
                  </div>
                  <div>
                    <label htmlFor="rating" className="block text-[12px] text-muted-foreground mb-1">評価（任意）</label>
                    <input
                      id="rating"
                      type="number"
                      min="1"
                      max="5"
                      className="w-full text-[14px] px-3 py-2 rounded-[var(--radius-sm)] border border-border/70 bg-white/80"
                      value={logRating}
                      onChange={(e) => setLogRating(e.target.value)}
                      placeholder="1〜5"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="notes" className="block text-[12px] text-muted-foreground mb-1">メモ（任意）</label>
                    <textarea
                      id="notes"
                      rows={3}
                      className="w-full text-[14px] px-3 py-2 rounded-[var(--radius-sm)] border border-border/70 bg-white/80"
                      value={logNotes}
                      onChange={(e) => setLogNotes(e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-2 flex items-center gap-2">
                    <input
                      id="also"
                      type="checkbox"
                      checked={logAlsoConsume}
                      onChange={(e) => setLogAlsoConsume(e.target.checked)}
                    />
                    <label htmlFor="also" className="text-[13px] text-foreground">
                      在庫も減らす（-{Math.max(1, Math.floor(Number(logDose) || 0))}g）
                    </label>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    className="rounded-[var(--radius-sm)] border border-border/70 bg-white/80 text-foreground px-3"
                    onClick={() => router.push(`/bags/${bag.id}`)}
                    disabled={saving}
                  >
                    キャンセル
                  </Button>
                  <Button
                    className="tracking-[0.08em]"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? '保存中...' : '保存'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
        </main>
      </div>
    </div>
  );
}
