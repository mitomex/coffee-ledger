'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Modal, ModalTitle } from '@/components/ui/modal';
import { Card, CardContent } from '@/components/ui/card';
import { DeleteConfirmationModal } from '@/components/ui/delete-confirmation-modal';
import { deleteBag } from '@/lib/delete-bag';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit2, SplitSquareHorizontal, Plus, Pencil, Trash2, X } from 'lucide-react';
import type { Bag, ConsumeLog } from '@/lib/types';
import { resolveDose, cupsLeft, dateLabel, formatJPY, sumConsumedLogs, toJP } from '@/lib/utils/coffee';
import { getValidImageUrl } from '@/lib/utils/image';
import { db } from '@/lib/db';
import { withUpdatedBagMetadata } from '@/lib/utils/bag-metadata';
import { SiteWordmark } from '@/components/SiteWordmark';
import { cancelSubscription, resumeSubscription } from '@/lib/subscription';

const APP_DOSE_DEFAULT = 14;

interface DetailPageProps {
  bagId: string;
  editLogId?: string;
}

export default function DetailPage({ bagId, editLogId }: DetailPageProps){
  const router = useRouter();
  const [bag, setBag] = useState<Bag | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState('');
  const [savingLog, setSavingLog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [parentBag, setParentBag] = useState<Bag | null>(null);
  const [childBags, setChildBags] = useState<Bag[]>([]);
  const [editingLog, setEditingLog] = useState<ConsumeLog | null>(null);
  const [editForm, setEditForm] = useState<{
    grams: number;
    grindSize: string;
    waterTemp: string;
    waterAmount: string;
    notes: string;
    dripper: string;
    grinder: string;
    brewTime: string;
    yieldAmount: string;
    bloomTime: string;
    rating: string;
  }>({ grams: 0, grindSize: '', waterTemp: '', waterAmount: '', notes: '', dripper: '', grinder: '', brewTime: '', yieldAmount: '', bloomTime: '', rating: '' });

  useEffect(() => {
    const loadBag = async () => {
      try {
        const foundBag = await db.bags.get(bagId);
        if (foundBag) {
          setBag(foundBag);
          if (editLogId) {
            const selectedLog = foundBag.consumeLogs.find(log => log.id === editLogId);
            if (selectedLog) startEditLog(selectedLog);
            else setActionError('編集する抽出記録が見つかりません');
          }
          // 新しい画像ストレージシステムで画像URLを取得
          const displayUrl = await getValidImageUrl(foundBag.imageId);
          setImageUrl(displayUrl);

          // 親Bagがある場合は取得
          if (foundBag.parentBagId) {
            const parent = await db.bags.get(foundBag.parentBagId);
            setParentBag(parent ?? null);
          }

          // セットの場合、子Bagを取得
          if (foundBag.isSet && foundBag.childBagIds && foundBag.childBagIds.length > 0) {
            const children = await Promise.all(
              foundBag.childBagIds.map(id => db.bags.get(id))
            );
            setChildBags(children.filter((child): child is Bag => child !== undefined));
          }
        }
      } catch (error) {
        console.error('Failed to load bag:', error);
      } finally {
        setLoading(false);
      }
    };
    loadBag();
  }, [bagId, editLogId]);
  
  const updateBag = async (updatedBag: Bag) => {
    try {
      const versioned = withUpdatedBagMetadata(updatedBag);
      await db.bags.put(versioned);
      setBag(versioned);

      // 画像が変更された場合は画像URLも更新
      if (versioned.imageId !== bag?.imageId) {
        const displayUrl = await getValidImageUrl(versioned.imageId);
        setImageUrl(displayUrl);
      }
    } catch (error) {
      console.error('Failed to update bag:', error);
      throw error;
    }
  };

  // サブスクリプション解約
  async function handleCancelSubscription() {
    if (!bag?.id) return;
    try {
      await cancelSubscription(bag.id);
      // Bagを再読み込み
      const updatedBag = await db.bags.get(bag.id);
      if (updatedBag) {
        setBag(updatedBag);
      }
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
    }
  }

  // サブスクリプション再開
  async function handleResumeSubscription() {
    if (!bag?.id) return;
    try {
      await resumeSubscription(bag.id);
      // Bagを再読み込み
      const updatedBag = await db.bags.get(bag.id);
      if (updatedBag) {
        setBag(updatedBag);
      }
    } catch (error) {
      console.error('Failed to resume subscription:', error);
    }
  }

  // 抽出ログ削除
  async function deleteConsumeLog(logId: string) {
    if (!bag) return;
    const logToDelete = bag.consumeLogs.find(l => l.id === logId);
    if (!logToDelete) return;

    const updatedBag: Bag = {
      ...bag,
      consumeLogs: bag.consumeLogs.filter(l => l.id !== logId),
      // reducesStock=trueの場合のみ残量を復元
      remaining_g: logToDelete.reducesStock
        ? Math.min(bag.bagWeight_g, bag.remaining_g + logToDelete.grams)
        : bag.remaining_g,
    };
    try {
      await updateBag(updatedBag);
    } catch {
      setActionError('記録を削除できませんでした。もう一度お試しください。');
    }
  }

  // 抽出ログ編集開始
  function startEditLog(log: ConsumeLog) {
    setEditingLog(log);
    setEditForm({
      grams: log.grams,
      grindSize: log.grindSize || '',
      waterTemp: log.waterTemp?.toString() || '',
      waterAmount: log.waterAmount?.toString() || '',
      notes: log.notes || '',
      dripper: log.dripper || '',
      grinder: log.grinder || '',
      brewTime: log.brewTime || '',
      yieldAmount: log.yieldAmount?.toString() || '',
      bloomTime: log.bloomTime?.toString() || '',
      rating: log.rating?.toString() || '',
    });
  }

  // 抽出ログ編集保存
  async function saveEditLog() {
    if (!bag || !editingLog || savingLog) return;
    setActionError('');
    if (!Number.isFinite(editForm.grams) || editForm.grams < 1 ||
        (editingLog.reducesStock && editForm.grams > bag.remaining_g + editingLog.grams)) {
      setActionError('豆量は1g以上、利用可能な残量以下で入力してください。');
      return;
    }

    const newGrams = Math.max(1, Math.floor(editForm.grams));
    const gramsDiff = newGrams - editingLog.grams;

    const updatedLog: ConsumeLog = {
      ...editingLog,
      grams: newGrams,
      grindSize: editForm.grindSize || undefined,
      waterTemp: editForm.waterTemp ? Number(editForm.waterTemp) : undefined,
      waterAmount: editForm.waterAmount ? Number(editForm.waterAmount) : undefined,
      notes: editForm.notes || undefined,
      dripper: editForm.dripper || undefined,
      grinder: editForm.grinder || undefined,
      brewTime: editForm.brewTime || undefined,
      yieldAmount: editForm.yieldAmount ? Number(editForm.yieldAmount) : undefined,
      bloomTime: editForm.bloomTime ? Number(editForm.bloomTime) : undefined,
      rating: editForm.rating ? Number(editForm.rating) : undefined,
    };

    const updatedBag: Bag = {
      ...bag,
      consumeLogs: bag.consumeLogs.map(l => l.id === editingLog.id ? updatedLog : l),
      // reducesStock=trueの場合のみ残量を調整
      remaining_g: editingLog.reducesStock
        ? Math.max(0, bag.remaining_g - gramsDiff)
        : bag.remaining_g,
    };

    setSavingLog(true);
    try {
      await updateBag(updatedBag);
      setEditingLog(null);
      if (editLogId) router.push(`/bags/${bag.id}/extraction/${editLogId}`);
    } catch {
      setActionError('記録を保存できませんでした。もう一度お試しください。');
    } finally {
      setSavingLog(false);
    }
  }

  function closeLogEditor() {
    if (savingLog) return;
    setEditingLog(null);
    setActionError('');
    if (editLogId && bag) router.push(`/bags/${bag.id}/extraction/${editLogId}`);
  }

  async function handleDeleteBag() {
    if (!bag || deleting) return;
    setDeleting(true);
    setActionError('');
    try {
      await deleteBag(bag.id);
      router.push('/');
    } catch {
      setActionError('削除できませんでした。もう一度お試しください。');
      setDeleting(false);
    }
  }

  // 抽出記録は別画面へ遷移
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
  
  const dose = resolveDose(APP_DOSE_DEFAULT, bag.roaster, bag.bagDose_g);
  const cups = cupsLeft(bag.remaining_g, dose);
  const processLabel = bag.process?.trim() ? bag.process : '未選択';

  // セット商品の場合は子Bagの合計重量を計算
  const displayBagWeight = bag.isSet
    ? childBags.reduce((sum, child) => sum + child.bagWeight_g, 0)
    : bag.bagWeight_g;

  return (
    <div className="page-shell">
      <div className="page-shell__content flex flex-col gap-12">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="tracking-[0.12em]"
            onClick={() => router.push('/')}
          >
            <ArrowLeft className="h-4 w-4" />
            戻る
          </Button>
            <SiteWordmark />
          </div>
        </header>

        <main id="main-content" tabIndex={-1} className="space-y-8">
        {/* 親Bagリンク */}
        {bag?.parentBagId && parentBag && (
          <div className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] border border-border/70 bg-white/80 px-3 py-2 text-[12px] text-muted-foreground">
            <SplitSquareHorizontal className="h-3 w-3 flex-shrink-0" />
            <button
              className="text-[12px] text-muted-foreground hover:text-foreground transition-colors underline-offset-2 hover:underline"
              onClick={() => router.push(`/bags/${parentBag.id}`)}
            >
              {parentBag.name}
            </button>
            <span className="whitespace-nowrap">の一部</span>
          </div>
        )}

        <section>
          <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-5">
            <div className="w-full sm:w-[160px] flex-shrink-0">
              <Image
                src={imageUrl}
                alt={`${bag.name}の画像`}
                width={160}
                height={160}
                className="w-full rounded-[4px] border border-border/70"
                style={{
                  imageRendering: '-webkit-optimize-contrast' as React.CSSProperties['imageRendering'],
                  transform: 'translateZ(0)',
                }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-[20px] sm:text-[22px] font-semibold leading-tight break-words">{bag.name}</h1>
              <div className="text-[13px] text-muted-foreground mt-1">
                {bag.roaster}
                {!bag.isSet && bag.variety && ` / ${bag.variety}`}
                {!bag.isSet && ` / ${processLabel}`}
              </div>
              <div className="text-[12px] text-muted-foreground">
                {dateLabel(bag)}
                {!bag.isSet && bag.farm && ` ・ ${bag.farm}`}
                {!bag.isSet && bag.country && ` ・ ${bag.country}`}
              </div>
              <div className="text-[12px] text-muted-foreground mt-1">
                購入 {displayBagWeight}g ・ {formatJPY(bag.isSet ? bag.setInfo?.totalPriceJPY : bag.priceJPY)} ・ 累計消費（ログ） {sumConsumedLogs(bag)}g
              </div>
              {bag.notes && (
                <div className="mt-2">
                  <div className="text-[12px] text-muted-foreground mb-1">フレーバーノート</div>
                  <div className="text-[13px] text-foreground leading-relaxed break-words">
                    {bag.notes.split('\n').map((line, index, lines) => (
                      <React.Fragment key={`bag-note-line-${index}`}>
                        {line}
                        {index < lines.length - 1 && <br />}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* セット商品情報 */}
        {bag.isSet && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SplitSquareHorizontal className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-[15px] sm:text-[16px] font-semibold">セット内容</h2>
                <span className="text-[12px] text-muted-foreground">（{bag.childBagIds?.length ?? 0}件）</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 text-[12px]"
                onClick={() => router.push(`/bags/${bag.id}/set/add`)}
              >
                <Plus className="h-3 w-3 mr-1" />
                追加
              </Button>
            </div>

            {/* セット内容リスト */}
            {childBags.length > 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {childBags.map((child) => {
                  const childCups = cupsLeft(child.remaining_g, resolveDose(APP_DOSE_DEFAULT, child.roaster, child.bagDose_g));
                  const remainingPercent = Math.round((child.remaining_g / child.bagWeight_g) * 100);
                  return (
                    <Card
                      key={child.id}
                      className="py-0 rounded-[var(--radius-md)] bg-white/80 border border-border/70 shadow-sm cursor-pointer hover:bg-white/90 transition-colors"
                    >
                      <Link href={`/bags/${child.id}`} className="block rounded-md focus-visible:outline-2 focus-visible:outline-offset-2">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="text-[14px] font-medium truncate">{child.name}</div>
                            <div className="text-[12px] text-muted-foreground mt-0.5">
                              {child.variety && `${child.variety} / `}{child.process || '未選択'}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-[14px] font-semibold">{child.remaining_g}g</div>
                            <div className="text-[11px] text-muted-foreground">あと{childCups}杯</div>
                          </div>
                        </div>
                        {/* 残量バー */}
                        <div className="mt-3">
                          <div className="h-1.5 bg-border/50 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary/70 rounded-full transition-all"
                              style={{ width: `${remainingPercent}%` }}
                            />
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-1 text-right">
                            {remainingPercent}% 残
                          </div>
                        </div>
                      </CardContent>
                      </Link>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="py-0 rounded-[var(--radius-md)] bg-white/60 border border-dashed border-border/70">
                <CardContent className="p-6 text-center">
                  <p className="text-[13px] text-muted-foreground">セット内容がまだ登録されていません</p>
                </CardContent>
              </Card>
            )}
          </section>
        )}

        {bag.isSubscriptionTemplate && (
          <p className="text-sm text-muted-foreground">これは定期購入設定です。在庫には含めません。届いた豆は別の在庫として管理します。</p>
        )}
        {/* サブスクリプション情報 */}
        {bag.isSubscriptionTemplate && bag.subscriptionInfo && (
          <section>
            <Card className="rounded-[var(--radius-md)] bg-white/80 border border-border/70">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-[16px]">🔄</span>
                  <h2 className="text-[16px] font-semibold">定期購入設定</h2>
                  <div className="ml-auto">
                    {bag.subscriptionInfo.isActive ? (
                      <span className="inline-block px-2 py-1 rounded-[var(--radius-sm)] bg-primary/10 text-primary text-[11px] font-medium">
                        有効
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-1 rounded-[var(--radius-sm)] bg-muted text-muted-foreground text-[11px] font-medium">
                        解約済み
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-2 text-[13px]">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">配送日</span>
                    <span className="font-medium">毎月{bag.subscriptionInfo.dayOfMonth}日</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">次回配送</span>
                    <span>{bag.subscriptionInfo.nextDeliveryDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">開始日</span>
                    <span>{bag.subscriptionInfo.startDate}</span>
                  </div>
                </div>

                {bag.subscriptionInfo.isActive ? (
                  <Button
                    variant="destructive"
                    className="w-full tracking-[0.12em]"
                    onClick={handleCancelSubscription}
                  >
                    解約する
                  </Button>
                ) : (
                  <Button
                    className="w-full tracking-[0.12em]"
                    onClick={handleResumeSubscription}
                  >
                    再開する
                  </Button>
                )}
              </CardContent>
            </Card>
          </section>
        )}

        {/* summary cards - Only for non-set bags */}
        {!bag.isSet && !bag.isSubscriptionTemplate && (
          <section>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <Card className="py-0 rounded-[var(--radius-md)] bg-white/80 border border-border/70 shadow-sm"><CardContent className="p-3 sm:p-4"><div className="text-[11px] sm:text-[12px] text-muted-foreground">残量</div><div className="text-[16px] sm:text-[18px] font-semibold">{bag.remaining_g}g</div></CardContent></Card>
              <Card className="py-0 rounded-[var(--radius-md)] bg-white/80 border border-border/70 shadow-sm"><CardContent className="p-3 sm:p-4"><div className="text-[11px] sm:text-[12px] text-muted-foreground">あと</div><div className="text-[16px] sm:text-[18px] font-semibold">{cups} 杯</div><div className="text-[11px] sm:text-[12px] text-muted-foreground">（{dose}g/杯）</div></CardContent></Card>
              <Card className="py-0 rounded-[var(--radius-md)] bg-white/80 border border-border/70 shadow-sm"><CardContent className="p-3 sm:p-4"><div className="text-[11px] sm:text-[12px] text-muted-foreground">プロセス</div><div className="text-[16px] sm:text-[18px] font-semibold">{processLabel}</div></CardContent></Card>
            </div>
          </section>
        )}
        {/* Existing records remain accessible, including legacy template records. */}
        {!bag.isSet && (!bag.isSubscriptionTemplate || bag.consumeLogs.length > 0) && (
          <section>
            <Card className="py-0 rounded-[var(--radius-md)] bg-white/80 border border-border/70 shadow-sm">
              <CardContent className="p-5 space-y-3">
                <div>
                  <h2 className="text-[15px] sm:text-[16px] font-semibold">消費履歴</h2>
                </div>
                <div className="space-y-2">
                  {[...bag.consumeLogs].sort((a,b)=> (b.date>a.date?1:-1)).map(l=> (
                  <div
                    key={l.id}
                    className="text-[12px] sm:text-[13px] bg-white/80 border border-border/70 rounded-[var(--radius-sm)] px-3 py-2 cursor-pointer hover:bg-white/90 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/bags/${bag.id}/extraction/${l.id}`} className="min-w-0 flex-1 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2">
                        <div className="font-medium break-words flex items-center gap-2">
                          <span>抽出記録 {l.grams}g</span>
                          {l.rating && (
                            <span className="text-foreground">{'★'.repeat(l.rating)}{'☆'.repeat(5 - l.rating)}</span>
                          )}
                          {!l.reducesStock && <span className="text-[11px] text-muted-foreground">（在庫は減算しない）</span>}
                        </div>
                        <div className="text-muted-foreground break-words mt-1">
                          {toJP(l.date)}
                          {l.dripper ? ` ・ ${l.dripper}` : ''}
                          {l.grinder ? ` ・ ${l.grinder}` : ''}
                          {l.grindSize ? ` ・ 挽き目：${l.grindSize}` : ''}
                          {l.waterTemp ? ` ・ 湯温：${l.waterTemp}℃` : ''}
                          {l.waterAmount ? ` ・ 湯量：${l.waterAmount}g` : ''}
                          {l.yieldAmount ? ` ・ 抽出量：${l.yieldAmount}ml` : ''}
                          {l.brewTime ? ` ・ 抽出時間：${l.brewTime}` : ''}
                          {l.bloomTime ? ` ・ 蒸らし：${l.bloomTime}秒` : ''}
                        </div>
                        {l.notes && (
                          <div className="text-muted-foreground mt-1 break-words">{l.notes}</div>
                        )}
                      </Link>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={(e) => { e.stopPropagation(); startEditLog(l); }}
                          aria-label={`${toJP(l.date)} ${l.grams}gの抽出記録を編集`}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={(e) => { e.stopPropagation(); deleteConsumeLog(l.id); }}
                          aria-label={`${toJP(l.date)} ${l.grams}gの抽出記録を削除`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
        )}

        {/* Edit Log Modal */}
        <Modal open={!!editingLog} onClose={closeLogEditor} busy={savingLog}>
          {editingLog && (
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <ModalTitle className="text-[16px] font-semibold">抽出記録を編集</ModalTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={closeLogEditor}
                    aria-label="編集を閉じる"
                    disabled={savingLog}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {actionError && <p id="edit-log-error" role="alert" className="text-sm text-destructive">{actionError}</p>}
                <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
                  <div>
                    <label htmlFor="edit-grams" className="block text-[12px] text-muted-foreground mb-1">豆量（g）</label>
                    <input
                      id="edit-grams"
                      aria-invalid={actionError.startsWith('豆量') || undefined}
                      aria-describedby={actionError ? 'edit-log-error' : undefined}
                      type="number"
                      className="w-full text-[14px] px-3 py-2 rounded-[var(--radius-sm)] border border-border/70 bg-white/80"
                      value={editForm.grams}
                      onChange={(e) => setEditForm({ ...editForm, grams: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-grind-size" className="block text-[12px] text-muted-foreground mb-1">挽き目</label>
                    <input
                      id="edit-grind-size"
                      type="text"
                      className="w-full text-[14px] px-3 py-2 rounded-[var(--radius-sm)] border border-border/70 bg-white/80"
                      value={editForm.grindSize}
                      onChange={(e) => setEditForm({ ...editForm, grindSize: e.target.value })}
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-water-temp" className="block text-[12px] text-muted-foreground mb-1">湯温（℃）</label>
                    <input
                      id="edit-water-temp"
                      type="number"
                      className="w-full text-[14px] px-3 py-2 rounded-[var(--radius-sm)] border border-border/70 bg-white/80"
                      value={editForm.waterTemp}
                      onChange={(e) => setEditForm({ ...editForm, waterTemp: e.target.value })}
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-water-amount" className="block text-[12px] text-muted-foreground mb-1">湯量（g）</label>
                    <input
                      id="edit-water-amount"
                      type="number"
                      className="w-full text-[14px] px-3 py-2 rounded-[var(--radius-sm)] border border-border/70 bg-white/80"
                      value={editForm.waterAmount}
                      onChange={(e) => setEditForm({ ...editForm, waterAmount: e.target.value })}
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-dripper" className="block text-[12px] text-muted-foreground mb-1">ドリッパー</label>
                    <input
                      id="edit-dripper"
                      type="text"
                      className="w-full text-[14px] px-3 py-2 rounded-[var(--radius-sm)] border border-border/70 bg-white/80"
                      value={editForm.dripper}
                      onChange={(e) => setEditForm({ ...editForm, dripper: e.target.value })}
                      placeholder="例：V60"
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-grinder" className="block text-[12px] text-muted-foreground mb-1">グラインダー</label>
                    <input
                      id="edit-grinder"
                      type="text"
                      className="w-full text-[14px] px-3 py-2 rounded-[var(--radius-sm)] border border-border/70 bg-white/80"
                      value={editForm.grinder}
                      onChange={(e) => setEditForm({ ...editForm, grinder: e.target.value })}
                      placeholder="例：Comandante C40"
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-brew-time" className="block text-[12px] text-muted-foreground mb-1">抽出時間</label>
                    <input
                      id="edit-brew-time"
                      type="text"
                      className="w-full text-[14px] px-3 py-2 rounded-[var(--radius-sm)] border border-border/70 bg-white/80"
                      value={editForm.brewTime}
                      onChange={(e) => setEditForm({ ...editForm, brewTime: e.target.value })}
                      placeholder="例：2:30"
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-yield-amount" className="block text-[12px] text-muted-foreground mb-1">抽出量（ml）</label>
                    <input
                      id="edit-yield-amount"
                      type="number"
                      className="w-full text-[14px] px-3 py-2 rounded-[var(--radius-sm)] border border-border/70 bg-white/80"
                      value={editForm.yieldAmount}
                      onChange={(e) => setEditForm({ ...editForm, yieldAmount: e.target.value })}
                      placeholder="例：180"
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-bloom-time" className="block text-[12px] text-muted-foreground mb-1">蒸らし時間（秒）</label>
                    <input
                      id="edit-bloom-time"
                      type="number"
                      className="w-full text-[14px] px-3 py-2 rounded-[var(--radius-sm)] border border-border/70 bg-white/80"
                      value={editForm.bloomTime}
                      onChange={(e) => setEditForm({ ...editForm, bloomTime: e.target.value })}
                      placeholder="例：30"
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-rating" className="block text-[12px] text-muted-foreground mb-1">評価（1-5）</label>
                    <input
                      id="edit-rating"
                      type="number"
                      min="1"
                      max="5"
                      className="w-full text-[14px] px-3 py-2 rounded-[var(--radius-sm)] border border-border/70 bg-white/80"
                      value={editForm.rating}
                      onChange={(e) => setEditForm({ ...editForm, rating: e.target.value })}
                      placeholder="1〜5"
                    />
                  </div>
                  <div className="col-span-2">
                    <label htmlFor="edit-notes" className="block text-[12px] text-muted-foreground mb-1">メモ</label>
                    <textarea
                      id="edit-notes"
                      rows={2}
                      className="w-full text-[14px] px-3 py-2 rounded-[var(--radius-sm)] border border-border/70 bg-white/80"
                      value={editForm.notes}
                      onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={closeLogEditor}
                  >
                    キャンセル
                  </Button>
                  <Button onClick={saveEditLog} disabled={savingLog}>
                    保存
                  </Button>
                </div>
              </CardContent>
          )}
        </Modal>

        {/* actions */}
        <section>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            {/* Consumption actions - Only for non-set bags */}
            {!bag.isSet && !bag.isSubscriptionTemplate && (
              <Button
                variant="outline"
                className="rounded-[var(--radius-sm)] border border-border/70 bg-white/80 text-foreground px-3 py-2"
                onClick={() => router.push(`/bags/${bag.id}/record`)}
              >
                抽出を記録
              </Button>
            )}
            <Button variant="destructive" onClick={() => { setActionError(''); setShowDeleteConfirm(true); }}>
              {bag.isSubscriptionTemplate ? '定期購入設定を削除' : bag.isSet ? 'セットを削除' : '豆を削除'}
            </Button>
            {/* Edit button - Available for all bags */}
            <Button
              variant="outline"
              className="rounded-[var(--radius-sm)] border border-border/70 bg-white/80 text-foreground px-3 py-2 flex items-center gap-2"
              onClick={() => router.push(`/bags/${bag.id}/edit`)}
              aria-label="バッグを編集"
            >
              <Edit2 className="w-3 h-3" />
              編集
            </Button>
          </div>


        </section>
      </main>
      {actionError && !editingLog && !showDeleteConfirm && <p role="alert">{actionError}</p>}
      <DeleteConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => { if (!deleting) setShowDeleteConfirm(false); }}
        onConfirm={handleDeleteBag}
        title={bag.isSubscriptionTemplate ? '定期購入設定の削除' : bag.isSet ? 'セットの削除' : '豆の削除'}
        message={`「${bag.name}」を削除しますか？${bag.isSet ? 'セット内の豆とその記録は残ります。' : bag.isSubscriptionTemplate ? '自動作成済みの豆は残ります。この設定に直接保存された記録は削除されます。' : 'この豆の抽出記録も削除されます。'}この操作は取り消せません。`}
        isLoading={deleting}
        errorMessage={actionError}
      />
      </div>
    </div>
  );
}
