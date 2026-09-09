'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SuccessModal } from '@/components/ui/success-modal';
import { ArrowLeft, Upload, Trash2 } from 'lucide-react';
import type { Bag, Process } from '@/lib/types';
import { deleteBag } from '@/lib/delete-bag';
import { db } from '@/lib/db';
import { ROASTER_TEMPLATES } from '@/lib/roaster-templates';
import { DeleteConfirmationModal } from '@/components/ui/delete-confirmation-modal';
import { storeImageData, convertFileToBase64, deleteImageData } from '@/lib/utils/image-storage';
import { SiteWordmark } from '@/components/SiteWordmark';
import { withUpdatedBagMetadata } from '@/lib/utils/bag-metadata';
import { calculateNextDeliveryDate } from '@/lib/subscription';

interface EditBagPageProps {
  bagId: string;
}

export default function EditBagPage({ bagId }: EditBagPageProps){
  const router = useRouter();
  const [bag, setBag] = useState<Bag | null>(null);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    name: '',
    roaster: '',
    priceJPY: '',
    bagWeight_g: '',
    roastDate: '',
    purchaseDate: '',
    process: '',
    variety: '',
    farm: '',
    country: '',
    notes: '',
    bagDose_g: '',
    remaining_g: '',
    setTotalPriceJPY: '',
    setTotalWeight_g: '',
    isSubscription: false,
    subscriptionDayOfMonth: undefined as number | undefined,
  });
  const [customProcess, setCustomProcess] = useState(false);
  const [customProcessValue, setCustomProcessValue] = useState('');
  const [imageUploading, setImageUploading] = useState(false);
  const [newImageId, setNewImageId] = useState<string | undefined>(undefined);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSetProduct, setIsSetProduct] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const found = await db.bags.get(bagId);
        if (found) {
          setBag(found);

          const isStandardProcess = ['Washed', 'Honey', 'Natural', 'Anaerobic'].includes(found.process);
          setCustomProcess(!isStandardProcess && found.process !== '');
          setCustomProcessValue(!isStandardProcess ? found.process : '');
          setIsSetProduct(found.isSet || false);

          setForm({
            name: found.name || '',
            roaster: found.roaster || '',
            priceJPY: found.priceJPY ? String(found.priceJPY) : '',
            bagWeight_g: String(found.bagWeight_g) || '',
            roastDate: found.roastDate || '',
            purchaseDate: found.purchaseDate || '',
            process: found.process || '',
            variety: found.variety || '',
            farm: found.farm || '',
            country: found.country || '',
            notes: found.notes || '',
            bagDose_g: found.bagDose_g ? String(found.bagDose_g) : '',
            remaining_g: String(found.remaining_g) || '',
            setTotalPriceJPY: found.setInfo?.totalPriceJPY ? String(found.setInfo.totalPriceJPY) : '',
            setTotalWeight_g: found.setInfo?.totalWeight_g ? String(found.setInfo.totalWeight_g) : '',
            isSubscription: found.isSubscriptionTemplate || false,
            subscriptionDayOfMonth: found.subscriptionInfo?.dayOfMonth,
          });
        }
      } catch (error) {
        console.error('Failed to load bag:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [bagId]);

  async function handleSave(){
    if (!bag) return;

    const baseUpdate: Bag = {
      ...bag,
      name: form.name || bag.name,
      roaster: form.roaster || bag.roaster,
      priceJPY: form.priceJPY ? Number(form.priceJPY) : undefined,
      bagWeight_g: Number(form.bagWeight_g) || bag.bagWeight_g,
      roastDate: form.roastDate || undefined,
      purchaseDate: form.purchaseDate || bag.purchaseDate,
      process: form.process as Process,
      variety: form.variety || undefined,
      farm: form.farm || undefined,
      country: form.country || undefined,
      bagDose_g: form.bagDose_g ? Number(form.bagDose_g) : undefined,
      remaining_g: Number(form.remaining_g) || bag.remaining_g,
      notes: form.notes || undefined,
      imageId: newImageId || bag.imageId,
      isSet: isSetProduct,
      childBagIds: isSetProduct ? (bag.childBagIds || []) : undefined,
      setInfo: isSetProduct && form.setTotalPriceJPY
        ? {
            totalPriceJPY: Number(form.setTotalPriceJPY),
            purchaseDate: form.purchaseDate || bag.purchaseDate,
            totalWeight_g: form.setTotalWeight_g ? Number(form.setTotalWeight_g) : undefined,
          }
        : bag.setInfo,
    };

    // サブスクリプション情報の更新
    if (form.isSubscription && form.subscriptionDayOfMonth) {
      const purchaseDate = form.purchaseDate || bag.purchaseDate;
      const nextDeliveryDate = bag.subscriptionInfo?.nextDeliveryDate
        || calculateNextDeliveryDate(purchaseDate, form.subscriptionDayOfMonth);

      baseUpdate.isSubscriptionTemplate = true;
      baseUpdate.subscriptionInfo = {
        dayOfMonth: form.subscriptionDayOfMonth,
        nextDeliveryDate,
        isActive: bag.subscriptionInfo?.isActive ?? true,
        startDate: bag.subscriptionInfo?.startDate || purchaseDate,
      };
    } else {
      // サブスクリプションを解除する場合
      baseUpdate.isSubscriptionTemplate = false;
      baseUpdate.subscriptionInfo = undefined;
    }

    // セット商品に変更する場合、remaining_gを0にする
    const updated: Bag = isSetProduct && !bag.isSet
      ? { ...baseUpdate, remaining_g: 0 }
      : baseUpdate;

    const versioned = withUpdatedBagMetadata(updated);

    try {
      await db.bags.put(versioned);

      // 成功モーダルを表示
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Failed to update bag:', error);
      alert('保存に失敗しました');
    }
  }

  function handleModalClose() {
    setShowSuccessModal(false);
    if (bag) {
      router.push(`/bags/${bag.id}`);
    }
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!bag) return;
    const file = event.target.files?.[0];
    if (!file) return;

    setImageUploading(true);
    try {
      const base64 = await convertFileToBase64(file, {
        maxWidth: 800,
        maxHeight: 600,
        quality: 0.9,
        useHighDPI: true
      });
      const imageId = await storeImageData(base64);

      if (bag.imageId) {
        try {
          await deleteImageData(bag.imageId);
        } catch (e) {
          console.warn('Old image delete failed:', e);
        }
      }

      setNewImageId(imageId);
    } catch (error) {
      console.error('Failed to upload image:', error);
      alert('画像のアップロードに失敗しました');
    } finally {
      setImageUploading(false);
    }
  };

  async function handleConfirmDelete(){
    if (!bag) return;
    setIsDeleting(true);
    try {
      await deleteBag(bag.id);
      router.push('/');
    } catch (error) {
      console.error('Delete failed:', error);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

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
          <h1 className="text-[18px] sm:text-[20px] font-semibold tracking-tight mb-3 sm:mb-4">豆の情報を編集</h1>
          <Card className="py-0 rounded-[var(--radius-md)] bg-white/80 border border-border/70 shadow-sm">
            <CardContent className="p-4 sm:p-5 space-y-4 sm:space-y-5">
              {/* 画像アップロード */}
              <div className="border border-border/70 rounded-[var(--radius-sm)] p-4 bg-white/80">
                <p className="block text-[13px] text-muted-foreground mb-2">豆の画像</p>
                <div className="space-y-2">
                  <div>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="sr-only peer" id="edit-image-upload" disabled={imageUploading} />
                    <label
                      htmlFor="edit-image-upload"
                      className={`peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 inline-flex items-center gap-2 px-3 py-2 text-[13px] border border-border/70 rounded-[var(--radius-sm)] cursor-pointer transition-colors ${imageUploading ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'bg-white/80 text-foreground hover:bg-muted'}`}
                    >
                      <Upload className="w-4 h-4" />
                      {imageUploading ? '画像アップロード中...' : '画像をアップロード'}
                    </label>
                  </div>
                  {(newImageId || bag.imageId) && (
                    <div className="text-[12px] text-muted-foreground">{newImageId ? '新しい画像がアップロードされました' : '画像が設定されています'}</div>
                  )}
                </div>
              </div>

              {/* 基本情報 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="min-w-0">
                  <label htmlFor="edit-name" className="block text-[13px] text-muted-foreground mb-1">名前</label>
                  <input id="edit-name" value={form.name} onChange={(e)=>setForm({...form, name:e.target.value})} className="w-full text-[14px] px-3 py-2 rounded-[var(--radius-sm)] border border-border/70 bg-white/80" />
                </div>
                <div className="min-w-0">
                  <label htmlFor="edit-roaster" className="block text-[13px] text-muted-foreground mb-1">ロースター</label>
                  <input id="edit-roaster" value={form.roaster} onChange={(e)=>setForm({...form, roaster:e.target.value})} className="w-full text-[14px] px-3 py-2 rounded-[var(--radius-sm)] border border-border/70 bg-white/80" />
                </div>
                <div className="min-w-0">
                  <label htmlFor="edit-purchaseDate" className="block text-[13px] text-muted-foreground mb-1">購入日（必須）</label>
                  <input required id="edit-purchaseDate" type="date" value={form.purchaseDate} onChange={(e)=>setForm({...form, purchaseDate:e.target.value})} className="w-full max-w-full text-[14px] px-3 py-2 rounded-[var(--radius-sm)] border border-border/70 bg-white/80" />
                </div>

                {/* 焙煎日（通常の袋のみ） */}
                {!isSetProduct && (
                <div className="min-w-0">
                  <label htmlFor="roastDate" className="block text-[13px] text-muted-foreground mb-1">焙煎日（任意・到着後に入力）</label>
                  <input id="roastDate" type="date" value={form.roastDate} onChange={(e)=>setForm({...form, roastDate:e.target.value})} className="w-full max-w-full text-[14px] px-3 py-2 rounded-[var(--radius-sm)] border border-border/70 bg-white/80" />
                </div>
                )}

                {/* 袋重量（通常の袋のみ） */}
                {!isSetProduct && (
                <div className="min-w-0">
                  <label htmlFor="bagWeight_g" className="block text-[13px] text-muted-foreground mb-1">袋重量（g・必須）</label>
                  <input required id="bagWeight_g" type="number" value={form.bagWeight_g} onChange={(e)=>setForm({...form, bagWeight_g:e.target.value})} className="w-full text-[14px] px-3 py-2 rounded-[var(--radius-sm)] border border-border/70 bg-white/80" />
                </div>
                )}

                {/* 現在の残量（通常の袋のみ） */}
                {!isSetProduct && (
                <div className="min-w-0">
                  <label htmlFor="remaining_g" className="block text-[13px] text-muted-foreground mb-1">現在の残量（g・任意）</label>
                  <input id="remaining_g" type="number" value={form.remaining_g} onChange={(e)=>setForm({...form, remaining_g:e.target.value})} className="w-full text-[14px] px-3 py-2 rounded-[var(--radius-sm)] border border-border/70 bg-white/80" />
                </div>
                )}

                {/* 価格（通常の袋のみ） */}
                {!isSetProduct && (
                <div className="min-w-0">
                  <label htmlFor="priceJPY" className="block text-[13px] text-muted-foreground mb-1">価格（¥・任意）</label>
                  <input id="priceJPY" type="number" value={form.priceJPY} onChange={(e)=>setForm({...form, priceJPY:e.target.value})} className="w-full text-[14px] px-3 py-2 rounded-[var(--radius-sm)] border border-border/70 bg-white/80" />
                </div>
                )}

                {/* セット価格（セット商品のみ） */}
                {isSetProduct && (
                <div className="min-w-0">
                  <label htmlFor="setTotalPriceJPY" className="block text-[13px] text-muted-foreground mb-1">セット価格（¥・必須）</label>
                  <input required id="setTotalPriceJPY" type="number" inputMode="numeric" value={form.setTotalPriceJPY} onChange={(e)=>setForm({...form, setTotalPriceJPY:e.target.value})} className="w-full text-[14px] px-3 py-2 rounded-[var(--radius-sm)] border border-border/70 bg-white/80" />
                </div>
                )}

                {/* セット合計重量（セット商品のみ） */}
                {isSetProduct && (
                <div className="min-w-0">
                  <label htmlFor="setTotalWeight_g" className="block text-[13px] text-muted-foreground mb-1">セット合計重量（g・任意）</label>
                  <input id="setTotalWeight_g" type="number" inputMode="numeric" value={form.setTotalWeight_g} onChange={(e)=>setForm({...form, setTotalWeight_g:e.target.value})} className="w-full text-[14px] px-3 py-2 rounded-[var(--radius-sm)] border border-border/70 bg-white/80" />
                </div>
                )}

                {/* プロセス（通常の袋のみ） */}
                {!isSetProduct && (
                <div className="min-w-0">
                  <label htmlFor="process" className="block text-[13px] text-muted-foreground mb-1">プロセス</label>
                  {!customProcess ? (
                    <div className="flex gap-2">
                      <select
                        id="process"
                        value={form.process}
                        onChange={(e)=>{
                          if (e.target.value === 'custom') {
                            setCustomProcess(true);
                            setCustomProcessValue('');
                            setForm({...form, process:''});
                          } else {
                            setForm({...form, process:e.target.value});
                          }
                        }}
                        className="flex-1 text-[14px] px-3 py-2 rounded-[var(--radius-sm)] border border-border/70 bg-white/80"
                      >
                        <option value="">未選択</option>
                        <option value="Washed">Washed</option>
                        <option value="Honey">Honey</option>
                        <option value="Natural">Natural</option>
                        <option value="Anaerobic">Anaerobic</option>
                        <option value="custom">その他（手入力）</option>
                      </select>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input id="process" type="text" value={customProcessValue} onChange={(e)=>{ setCustomProcessValue(e.target.value); setForm({...form, process:e.target.value}); }} placeholder="プロセス名を入力" className="flex-1 text-[14px] px-3 py-2 rounded-[var(--radius-sm)] border border-border/70 bg-white/80" />
                      <Button type="button" size="sm" variant="outline" className="rounded-[var(--radius-sm)] border border-border/70 bg-white/80 text-foreground px-3 py-2 text-[13px]" onClick={()=>{ setCustomProcess(false); setCustomProcessValue(''); setForm({...form, process:''}); }}>戻る</Button>
                    </div>
                  )}
                </div>
                )}

                {/* 品種（通常の袋のみ） */}
                {!isSetProduct && (
                <div className="min-w-0">
                  <label htmlFor="variety" className="block text-[13px] text-muted-foreground mb-1">品種（Variety・任意）</label>
                  <input id="variety" value={form.variety} onChange={(e)=>setForm({...form, variety:e.target.value})} placeholder="例：ゲイシャ、ブルボン、カトゥーラ" className="w-full text-[14px] px-3 py-2 rounded-[var(--radius-sm)] border border-border/70 bg-white/80" />
                </div>
                )}

                {/* 農園（通常の袋のみ） */}
                {!isSetProduct && (
                <div className="min-w-0">
                  <label htmlFor="farm" className="block text-[13px] text-muted-foreground mb-1">農園（任意）</label>
                  <input id="farm" value={form.farm} onChange={(e)=>setForm({...form, farm:e.target.value})} placeholder="例：コンガ農園" className="w-full text-[14px] px-3 py-2 rounded-[var(--radius-sm)] border border-border/70 bg-white/80" />
                </div>
                )}

                {/* 生産国（通常の袋のみ） */}
                {!isSetProduct && (
                <div className="min-w-0">
                  <label htmlFor="country" className="block text-[13px] text-muted-foreground mb-1">生産国（任意）</label>
                  <input id="country" value={form.country} onChange={(e)=>setForm({...form, country:e.target.value})} placeholder="例：エチオピア" className="w-full text-[14px] px-3 py-2 rounded-[var(--radius-sm)] border border-border/70 bg-white/80" />
                </div>
                )}

                {/* この袋の1杯量（通常の袋のみ） */}
                {!isSetProduct && (
                <div className="min-w-0">
                  <label htmlFor="bagDose_g" className="block text-[13px] text-muted-foreground mb-1">この袋の1杯量（g・任意）</label>
                  <input id="bagDose_g" type="number" placeholder={`${ROASTER_TEMPLATES[form.roaster]?.dose_g ?? 14}`} value={form.bagDose_g} onChange={(e)=>setForm({...form, bagDose_g:e.target.value})} className="w-full text-[14px] px-3 py-2 rounded-[var(--radius-sm)] border border-border/70 bg-white/80" />
                </div>
                )}
                <div className="sm:col-span-2 min-w-0">
                  <label htmlFor="edit-notes" className="block text-[13px] text-muted-foreground mb-1">メモ（フレーバーなど）</label>
                  <textarea id="edit-notes" value={form.notes} onChange={(e)=>setForm({...form, notes:e.target.value})} rows={5} className="w-full text-[14px] px-3 py-2 rounded-[var(--radius-sm)] border border-border/70 bg-white/80 sm:min-h-[80px] min-h-[120px]" placeholder="フレーバーノート、特徴、感想など..." />
                </div>
                <div className="sm:col-span-2 min-w-0">
                  <label className="flex items-center gap-2 text-[13px] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isSetProduct}
                      onChange={(e) => setIsSetProduct(e.target.checked)}
                      className="rounded border-border/70"
                    />
                    <span className="text-foreground">セット商品として登録</span>
                  </label>
                </div>

                {/* サブスクリプション設定（通常の袋のみ） */}
                <p className="text-xs text-muted-foreground">定期購入設定は在庫に含めません。届いた豆は別の在庫として登録してください。</p>
                {!isSetProduct && (
                  <div className="sm:col-span-2 min-w-0">
                    <label className="flex items-center gap-2 text-[13px] text-muted-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.isSubscription}
                        onChange={(e) => {
                          const isChecked = e.target.checked;
                          const dayOfMonth = isChecked && form.purchaseDate
                            ? new Date(form.purchaseDate).getDate()
                            : undefined;
                          setForm({
                            ...form,
                            isSubscription: isChecked,
                            subscriptionDayOfMonth: dayOfMonth
                          });
                        }}
                        className="rounded border-border/70"
                      />
                      定期購入設定として扱う
                    </label>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      毎月同じ日に自動で購入記録を作成します（購入日が18日なら毎月18日）
                    </p>
                    {form.isSubscription && form.subscriptionDayOfMonth && (
                      <p className="mt-1 text-[12px] text-foreground">
                        毎月<strong>{form.subscriptionDayOfMonth}日</strong>に自動追加されます
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* 統計情報（読み取り専用・通常の袋のみ） */}
              {!isSetProduct && (
              <div className="p-3 rounded-[var(--radius-sm)] border border-border/70 bg-white/50">
                <div className="text-[12px] text-muted-foreground space-y-1">
                  <div>消費ログ: {bag.consumeLogs.length}件</div>
                  <div>累計消費: {bag.consumeLogs.filter(l => l.reducesStock).reduce((sum, l) => sum + l.grams, 0)}g</div>
                </div>
              </div>
              )}

              {/* アクションボタン */}
              <div className="flex items-center justify-between pt-2">
                <Button variant="outline" className="rounded-[var(--radius-sm)] border border-destructive/40 bg-white/80 text-destructive px-3 py-2 flex items-center gap-2 hover:bg-destructive/5" onClick={()=>setShowDeleteConfirm(true)}>
                  <Trash2 className="w-4 h-4" />
                  削除
                </Button>
                <div className="flex items-center gap-2">
                  <Button variant="outline" className="rounded-[var(--radius-sm)] border border-border/70 bg-white/80 text-foreground px-4 py-2" onClick={()=>router.push(`/bags/${bag.id}`)}>キャンセル</Button>
                  <Button className="rounded-[var(--radius-sm)] bg-primary text-primary-foreground px-5 py-2" onClick={handleSave}>保存</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
      </div>

      {/* 削除確認モーダル */}
      <DeleteConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
        title="豆の削除"
        message={`「${bag.name}」を削除しますか？関連する消費ログも全て削除されます。この操作は取り消せません。`}
        confirmText="削除する"
        cancelText="キャンセル"
        isLoading={isDeleting}
      />

      {/* 成功モーダル */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={handleModalClose}
        title="保存完了"
        message="コーヒー豆の情報を更新しました"
      />
    </div>
  );
}
