'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, SplitSquareHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SuccessModal } from '@/components/ui/success-modal';
import { SiteWordmark } from '@/components/SiteWordmark';
import { db } from '@/lib/db';
import type { Bag } from '@/lib/types';
import { withUpdatedBagMetadata } from '@/lib/utils/bag-metadata';
import { createBagFromForm, validateForm } from '@/features/bag-new/utils/form-validation';
import type { NewBagForm } from '@/features/bag-new/utils/form-validation';
import { formatJPY } from '@/lib/utils/coffee';

interface AddChildBagPageProps {
  parentId: string;
}

const PROCESS_PRESETS = ['Washed', 'Honey', 'Natural', 'Anaerobic'] as const;

const isPresetProcess = (value: string): value is (typeof PROCESS_PRESETS)[number] =>
  PROCESS_PRESETS.includes(value as (typeof PROCESS_PRESETS)[number]);

const blankForm: NewBagForm = {
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
  isSet: false,
  setTotalPriceJPY: '',
  setPurchaseDate: '',
  setTotalWeight_g: '',
};

export default function AddChildBagPage({ parentId }: AddChildBagPageProps) {
  const router = useRouter();
  const [parentBag, setParentBag] = useState<Bag | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<NewBagForm>(blankForm);
  const [customProcess, setCustomProcess] = useState(false);
  const [customProcessValue, setCustomProcessValue] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const missing = validateForm(form);

  useEffect(() => {
    const load = async () => {
      try {
        const parent = await db.bags.get(parentId);
        setParentBag(parent ?? null);
        if (parent) {
          const initialProcess = parent.process || '';
          const shouldUseCustom = Boolean(initialProcess && !isPresetProcess(initialProcess));
          setForm({
            ...blankForm,
            name: '',
            roaster: parent.roaster || '',
            priceJPY: '',
            bagWeight_g: '',
            roastDate: '',
            purchaseDate: parent.purchaseDate || '',
            process: initialProcess,
            variety: '',
            notes: '',
            bagDose_g: parent.bagDose_g ? String(parent.bagDose_g) : '',
            isSet: false,
            setTotalPriceJPY: '',
            setPurchaseDate: '',
            setTotalWeight_g: '',
          });
          setCustomProcess(shouldUseCustom);
          setCustomProcessValue(shouldUseCustom ? initialProcess : '');
        } else {
          setCustomProcess(false);
          setCustomProcessValue('');
        }
      } catch (error) {
        console.error('Failed to load parent bag:', error);
        setParentBag(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [parentId]);

  const equalizedPrice = useMemo(() => {
    if (!parentBag?.setInfo) return null;
    const childCount = parentBag.childBagIds?.length ?? 0;
    if (childCount < 0) return null;
    return Math.floor(parentBag.setInfo.totalPriceJPY / Math.max(childCount + 1, 1));
  }, [parentBag]);

  async function handleSave() {
    if (!parentBag || saving) return;
    if (missing.length > 0) return;

    try {
      setSaving(true);
      const childBag = createBagFromForm(form);
      const childWithParent: Bag = {
        ...childBag,
        parentBagId: parentBag.id,
        isSet: childBag.isSet,
        childBagIds: undefined,
        setInfo: undefined,
      };

      await db.bags.add(childWithParent);

      const updatedParent: Bag = withUpdatedBagMetadata({
        ...parentBag,
        childBagIds: [...(parentBag.childBagIds ?? []), childWithParent.id],
        remaining_g: 0,
      });

      await db.bags.put(updatedParent);

      // 成功モーダルを表示
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Failed to save child bag:', error);
      alert('保存に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  function handleModalClose() {
    setShowSuccessModal(false);
    if (parentBag) {
      router.push(`/bags/${parentBag.id}`);
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

  if (!parentBag) {
    return (
      <main id="main-content" tabIndex={-1} className="page-shell">
        <div className="page-shell__content">
          <div className="flex flex-col items-center gap-4 rounded-[var(--radius-md)] border border-border/70 bg-white/70 px-8 py-14 text-center shadow-[0_24px_60px_-36px_rgba(0,0,0,0.1)]">
            <p className="text-sm text-muted-foreground">親セットが見つかりません</p>
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
              onClick={() => router.push(`/bags/${parentBag.id}`)}
            >
              <ArrowLeft className="h-4 w-4" />
              戻る
            </Button>
            <SiteWordmark />
          </div>
        </header>

        <main id="main-content" tabIndex={-1} className="space-y-8">
          <section className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] border border-border/70 bg-white/80 px-3 py-1 text-[12px] text-muted-foreground">
              <SplitSquareHorizontal className="h-3 w-3" />
              <span>親セット: {parentBag.name}</span>
            </div>
            <h1 className="text-[20px] sm:text-[22px] font-semibold leading-tight">セット内容を追加</h1>
            <p className="text-[12px] text-muted-foreground">
              セットに含まれる個別の豆を登録します。登録後は詳細画面でセット一覧に表示されます。
            </p>
          </section>

          <section>
            <Card className="py-0 rounded-[var(--radius-md)] bg-white/80 border border-border/70 shadow-sm">
              <CardContent className="p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className="block text-[13px] text-muted-foreground mb-1">名前</label>
                    <input
                      id="name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full text-[14px] px-3 py-2 rounded-[var(--radius-sm)] border border-border/70 bg-white/80"
                    />
                  </div>
                  <div>
                    <label htmlFor="roaster" className="block text-[13px] text-muted-foreground mb-1">ロースター</label>
                    <input
                      id="roaster"
                      value={form.roaster}
                      onChange={(e) => setForm({ ...form, roaster: e.target.value })}
                      className="w-full text-[14px] px-3 py-2 rounded-[var(--radius-sm)] border border-border/70 bg-white/80"
                    />
                  </div>
                  <div>
                    <label htmlFor="purchaseDate" className="block text-[13px] text-muted-foreground mb-1">購入日（必須）</label>
                    <input
                      id="purchaseDate"
            required
                      type="date"
                      value={form.purchaseDate}
                      onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
                      className="w-full text-[14px] px-3 py-2 rounded-[var(--radius-sm)] border border-border/70 bg-white/80"
                    />
                  </div>
                  <div>
                    <label htmlFor="bagWeight_g" className="block text-[13px] text-muted-foreground mb-1">袋重量（g・必須）</label>
                    <input
                      id="bagWeight_g"
            required
                      type="number"
                      inputMode="numeric"
                      value={form.bagWeight_g}
                      onChange={(e) => setForm({ ...form, bagWeight_g: e.target.value })}
                      className="w-full text-[14px] px-3 py-2 rounded-[var(--radius-sm)] border border-border/70 bg-white/80"
                    />
                  </div>
                  <div>
                    <label htmlFor="roastDate" className="block text-[13px] text-muted-foreground mb-1">焙煎日（任意・到着後に入力）</label>
                    <input
                      id="roastDate"
                      type="date"
                      value={form.roastDate}
                      onChange={(e) => setForm({ ...form, roastDate: e.target.value })}
                      className="w-full text-[14px] px-3 py-2 rounded-[var(--radius-sm)] border border-border/70 bg-white/80"
                    />
                  </div>
                  <div>
                    <label htmlFor="priceJPY" className="block text-[13px] text-muted-foreground mb-1">価格（¥・任意）</label>
                    <div className="flex items-center gap-2">
                      <input
                        id="priceJPY"
                        type="number"
                        inputMode="numeric"
                        value={form.priceJPY}
                        onChange={(e) => setForm({ ...form, priceJPY: e.target.value })}
                        className="w-full text-[14px] px-3 py-2 rounded-[var(--radius-sm)] border border-border/70 bg-white/80"
                      />
                      {equalizedPrice && (
                        <Button
                          type="button"
                          variant="outline"
                          className="text-[11px] px-2 py-1"
                          onClick={() => setForm({ ...form, priceJPY: String(equalizedPrice) })}
                        >
                          均等割
                        </Button>
                      )}
                    </div>
                    {equalizedPrice && (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        目安: {formatJPY(equalizedPrice)}（現在{parentBag.childBagIds?.length ?? 0}件登録済み）
                      </p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="process" className="block text-[13px] text-muted-foreground mb-1">プロセス</label>
                    {!customProcess ? (
                      <div className="flex gap-2">
                        <select
                          id="process"
                          value={isPresetProcess(form.process) ? form.process : ''}
                          onChange={(e) => {
                            if (e.target.value === 'custom') {
                              setCustomProcess(true);
                              setCustomProcessValue('');
                              setForm({ ...form, process: '' });
                              return;
                            }
                            setCustomProcess(false);
                            setCustomProcessValue('');
                            setForm({ ...form, process: e.target.value });
                          }}
                          className="flex-1 text-[14px] px-3 py-2 rounded-[var(--radius-sm)] border border-border/70 bg-white/80"
                        >
                          <option value="">未選択</option>
                          {PROCESS_PRESETS.map(option => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                          <option value="custom">その他（手入力）</option>
                        </select>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          id="process"
                          type="text"
                          value={customProcessValue}
                          onChange={(e) => {
                            setCustomProcessValue(e.target.value);
                            setForm({ ...form, process: e.target.value });
                          }}
                          placeholder="プロセス名を入力"
                          className="flex-1 text-[14px] px-3 py-2 rounded-[var(--radius-sm)] border border-border/70 bg-white/80"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-[var(--radius-sm)] border border-border/70 bg-white/80 text-foreground px-3 py-2 text-[13px]"
                          onClick={() => {
                            setCustomProcess(false);
                            setCustomProcessValue('');
                            setForm({ ...form, process: '' });
                          }}
                        >
                          戻る
                        </Button>
                      </div>
                    )}
                  </div>
                  <div>
                    <label htmlFor="variety" className="block text-[13px] text-muted-foreground mb-1">品種（Variety・任意）</label>
                    <input
                      id="variety"
                      value={form.variety}
                      onChange={(e) => setForm({ ...form, variety: e.target.value })}
                      placeholder="例：ゲイシャ、ブルボン、カトゥーラ"
                      className="w-full text-[14px] px-3 py-2 rounded-[var(--radius-sm)] border border-border/70 bg-white/80"
                    />
                  </div>
                  <div>
                    <label htmlFor="farm" className="block text-[13px] text-muted-foreground mb-1">農園（任意）</label>
                    <input
                      id="farm"
                      value={form.farm || ''}
                      onChange={(e) => setForm({ ...form, farm: e.target.value })}
                      placeholder="例：コンガ農園"
                      className="w-full text-[14px] px-3 py-2 rounded-[var(--radius-sm)] border border-border/70 bg-white/80"
                    />
                  </div>
                  <div>
                    <label htmlFor="country" className="block text-[13px] text-muted-foreground mb-1">生産国（任意）</label>
                    <input
                      id="country"
                      value={form.country || ''}
                      onChange={(e) => setForm({ ...form, country: e.target.value })}
                      placeholder="例：エチオピア"
                      className="w-full text-[14px] px-3 py-2 rounded-[var(--radius-sm)] border border-border/70 bg-white/80"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="notes" className="block text-[13px] text-muted-foreground mb-1">メモ（フレーバーなど）</label>
                    <textarea
                      id="notes"
                      rows={4}
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      className="w-full text-[14px] px-3 py-2 rounded-[var(--radius-sm)] border border-border/70 bg-white/80"
                    />
                  </div>
                  <div>
                    <label htmlFor="bagDose_g" className="block text-[13px] text-muted-foreground mb-1">この袋の1杯量（g・任意）</label>
                    <input
                      id="bagDose_g"
                      type="number"
                      inputMode="numeric"
                      value={form.bagDose_g}
                      onChange={(e) => setForm({ ...form, bagDose_g: e.target.value })}
                      className="w-full text-[14px] px-3 py-2 rounded-[var(--radius-sm)] border border-border/70 bg-white/80"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  <span>必須未入力:</span>
                  {missing.length === 0 ? <span>なし</span> : missing.map(label => (
                    <span key={label} className="inline-block px-2 py-[2px] rounded-[var(--radius-sm)] border border-border/70 bg-white/80">{label}</span>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <span className="text-[11px] sm:text-[12px] text-muted-foreground">必須は「購入日」と「袋重量」。価格は任意で入力できます。</span>
                  <Button
                    className="w-full sm:w-auto tracking-[0.1em] disabled:opacity-40"
                    disabled={missing.length > 0 || saving}
                    onClick={handleSave}
                  >
                    {saving ? '保存中...' : '保存'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
        </main>
      </div>

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={handleModalClose}
        title="保存完了"
        message="セット内容を登録しました"
      />
    </div>
  );
}
