import React from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Upload, Trash2 } from 'lucide-react';
import { ROASTER_TEMPLATES } from '@/lib/roaster-templates';
import type { NewBagForm } from '../utils/form-validation';

interface BagFormGridProps {
  form: NewBagForm;
  setForm: React.Dispatch<React.SetStateAction<NewBagForm>>;
  missing: string[];
  customProcess: boolean;
  setCustomProcess: React.Dispatch<React.SetStateAction<boolean>>;
  customProcessValue: string;
  setCustomProcessValue: React.Dispatch<React.SetStateAction<string>>;
  imagePreview: string | null;
  onImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: () => void;
  imageUploading: boolean;
}

export function BagFormGrid({
  form,
  setForm,
  missing,
  customProcess,
  setCustomProcess,
  customProcessValue,
  setCustomProcessValue,
  imagePreview,
  onImageUpload,
  onRemoveImage,
  imageUploading,
}: BagFormGridProps) {
  return (
    <>
      <div id="bag-required-summary" role="status" aria-live="polite" aria-atomic="true" className="flex flex-wrap items-center gap-2 text-[11px] sm:text-[12px] text-muted-foreground">
        <span>必須未入力:</span>
        {missing.length === 0 ? (
          <span>なし</span>
        ) : (
          missing.map((m) => (
            <span key={m} className="inline-block px-2 py-[2px] rounded-[var(--radius-sm)] border border-border/70 bg-white/80">
              {m}
            </span>
          ))
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="min-w-0">
          <label htmlFor="name" className="block text-[13px] text-muted-foreground mb-1">名前</label>
          <input
            id="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full text-[14px] px-3 py-2 rounded-[var(--radius-sm)] border border-border/70 bg-white/80"
          />
        </div>
        <div className="min-w-0">
          <label htmlFor="roaster" className="block text-[13px] text-muted-foreground mb-1">ロースター</label>
          <input
            id="roaster"
            value={form.roaster}
            onChange={(e) => setForm({ ...form, roaster: e.target.value })}
            className="w-full text-[14px] px-3 py-2 rounded-[var(--radius-sm)] border border-border/70 bg-white/80"
          />
        </div>
        <div className="min-w-0">
          <label htmlFor="purchaseDate" className="block text-[13px] text-muted-foreground mb-1">購入日（必須）</label>
          <input
            id="purchaseDate"
            required
            aria-describedby="bag-required-summary"
            type="date"
            value={form.purchaseDate}
            onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
            className="w-full max-w-full text-[14px] px-3 py-2 rounded-[var(--radius-sm)] border border-border/70 bg-white/80"
          />
        </div>

        <div className="sm:col-span-2 min-w-0">
          <label className="flex items-center gap-2 text-[13px] text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={form.isSet}
              onChange={(e) => setForm({ ...form, isSet: e.target.checked })}
              className="rounded border-border/70"
              id="isSet"
            />
            セット商品
          </label>
          <p className="mt-1 text-[11px] text-muted-foreground">
            複数のコーヒー豆がセットになっている商品の場合はチェックしてください
          </p>
        </div>

        {!form.isSet && (
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
                id="isSubscription"
              />
              定期購入設定として登録
            </label>
            <p className="mt-1 text-[11px] text-muted-foreground">
              この設定自体は在庫に含めません。開始日の翌月から、毎月同じ日の購入記録をアプリ起動時に作成します。初回の豆は通常の豆として別に登録してください。
            </p>
            {form.isSubscription && form.subscriptionDayOfMonth && (
              <p className="mt-1 text-[12px] text-foreground">
                毎月<strong>{form.subscriptionDayOfMonth}日</strong>に自動追加されます
              </p>
            )}
          </div>
        )}

        {form.isSet ? (
          <>
            <div className="min-w-0">
              <label htmlFor="setTotalPriceJPY" className="block text-[13px] text-muted-foreground mb-1">セット価格（¥・必須）</label>
              <input
                id="setTotalPriceJPY"
            required
            aria-describedby="bag-required-summary"
                type="number"
                inputMode="numeric"
                value={form.setTotalPriceJPY}
                onChange={(e) => setForm({ ...form, setTotalPriceJPY: e.target.value })}
                className="w-full text-[14px] px-3 py-2 rounded-[var(--radius-sm)] border border-border/70 bg-white/80"
              />
            </div>
            <div className="min-w-0">
              <label htmlFor="setTotalWeight_g" className="block text-[13px] text-muted-foreground mb-1">セット合計重量（g・任意）</label>
              <input
                id="setTotalWeight_g"
                type="number"
                inputMode="numeric"
                value={form.setTotalWeight_g}
                onChange={(e) => setForm({ ...form, setTotalWeight_g: e.target.value })}
                className="w-full text-[14px] px-3 py-2 rounded-[var(--radius-sm)] border border-border/70 bg-white/80"
              />
            </div>
          </>
        ) : (
          <div className="min-w-0">
            <label htmlFor="bagWeight_g" className="block text-[13px] text-muted-foreground mb-1">袋重量（g・必須）</label>
            <input
              id="bagWeight_g"
            required
            aria-describedby="bag-required-summary"
              type="number"
              inputMode="numeric"
              value={form.bagWeight_g}
              onChange={(e) => setForm({ ...form, bagWeight_g: e.target.value })}
              className="w-full text-[14px] px-3 py-2 rounded-[var(--radius-sm)] border border-border/70 bg-white/80"
            />
          </div>
        )}

        {!form.isSet && (
          <div className="min-w-0">
            <label htmlFor="roastDate" className="block text-[13px] text-muted-foreground mb-1">焙煎日（任意・到着後に入力）</label>
            <input
              id="roastDate"
              type="date"
              value={form.roastDate}
              onChange={(e) => setForm({ ...form, roastDate: e.target.value })}
              className="w-full max-w-full text-[14px] px-3 py-2 rounded-[var(--radius-sm)] border border-border/70 bg-white/80"
            />
          </div>
        )}

        {!form.isSet && (
          <div className="min-w-0">
            <label htmlFor="priceJPY" className="block text-[13px] text-muted-foreground mb-1">価格（¥・任意）</label>
            <input
              id="priceJPY"
              type="number"
              inputMode="numeric"
              value={form.priceJPY}
              onChange={(e) => setForm({ ...form, priceJPY: e.target.value })}
              className="w-full text-[14px] px-3 py-2 rounded-[var(--radius-sm)] border border-border/70 bg-white/80"
            />
          </div>
        )}

        {!form.isSet && (
          <div className="min-w-0">
            <label htmlFor="process" className="block text-[13px] text-muted-foreground mb-1">プロセス</label>
            {!customProcess ? (
              <div className="flex gap-2">
                <select
                  id="process"
                  value={form.process}
                  onChange={(e) => {
                    if (e.target.value === 'custom') {
                      setCustomProcess(true);
                      setForm({ ...form, process: '' });
                    } else {
                      setForm({ ...form, process: e.target.value });
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
        )}

        {!form.isSet && (
          <div className="min-w-0">
            <label htmlFor="variety" className="block text-[13px] text-muted-foreground mb-1">品種（Variety・任意）</label>
            <input
              id="variety"
              value={form.variety}
              onChange={(e) => setForm({ ...form, variety: e.target.value })}
              placeholder="例：ゲイシャ、ブルボン、カトゥーラ"
              className="w-full text-[14px] px-3 py-2 rounded-[var(--radius-sm)] border border-border/70 bg-white/80"
            />
          </div>
        )}

        {!form.isSet && (
          <div className="min-w-0">
            <label htmlFor="farm" className="block text-[13px] text-muted-foreground mb-1">農園（任意）</label>
            <input
              id="farm"
              value={form.farm}
              onChange={(e) => setForm({ ...form, farm: e.target.value })}
              placeholder="例：コンガ農園"
              className="w-full text-[14px] px-3 py-2 rounded-[var(--radius-sm)] border border-border/70 bg-white/80"
            />
          </div>
        )}

        {!form.isSet && (
          <div className="min-w-0">
            <label htmlFor="country" className="block text-[13px] text-muted-foreground mb-1">生産国（任意）</label>
            <input
              id="country"
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              placeholder="例：エチオピア"
              className="w-full text-[14px] px-3 py-2 rounded-[var(--radius-sm)] border border-border/70 bg-white/80"
            />
          </div>
        )}

        <div className="sm:col-span-2 min-w-0">
          <label htmlFor="notes" className="block text-[13px] text-muted-foreground mb-1">メモ（フレーバーなど）</label>
          <textarea
            id="notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={5}
            className="w-full text-[14px] px-3 py-2 rounded-[var(--radius-sm)] border border-border/70 bg-white/80 sm:min-h-[80px] min-h-[120px]"
          />
        </div>

        {!form.isSet && (
          <div className="min-w-0">
            <label htmlFor="bagDose_g" className="block text-[13px] text-muted-foreground mb-1">この袋の1杯量（g・任意）</label>
            <input
              id="bagDose_g"
              type="number"
              inputMode="numeric"
              placeholder={`${ROASTER_TEMPLATES[form.roaster]?.dose_g ?? 14}（未入力なら推奨/既定を使用）`}
              value={form.bagDose_g}
              onChange={(e) => setForm({ ...form, bagDose_g: e.target.value })}
              className="w-full text-[14px] px-3 py-2 rounded-[var(--radius-sm)] border border-border/70 bg-white/80"
            />
          </div>
        )}

        <div>
          <p className="block text-[13px] text-muted-foreground mb-1">画像（任意）</p>
          <div className="flex items-center gap-2">
            {imagePreview ? (
              <>
                <Image
                  src={imagePreview}
                  alt="プレビュー"
                  width={64}
                  height={40}
                  className="w-[64px] h-[40px] rounded-[4px] border border-border/70 object-cover"
                />
                <Button
                  variant="outline"
                  className="rounded-[var(--radius-sm)] border border-border/70 bg-white/80 text-foreground px-3 flex items-center gap-2"
                  onClick={onRemoveImage}
                  type="button"
                >
                  <Trash2 className="w-3 h-3" />
                  削除
                </Button>
              </>
            ) : (
              <>
                <div className="w-[64px] h-[40px] rounded-[4px] border border-border/70 bg-white/80" />
                <div>
                  <input
                    aria-label="画像を追加"
                    type="file"
                    accept="image/*"
                    onChange={onImageUpload}
                    className="hidden"
                    disabled={imageUploading}
                  />
                  <Button
                    variant="outline"
                    className="rounded-[var(--radius-sm)] border border-border/70 bg-white/80 text-foreground px-3 flex items-center gap-2"
                    disabled={imageUploading}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.currentTarget.parentElement?.querySelector('input')?.click();
                    }}
                  >
                    <Upload className="w-3 h-3" />
                    {imageUploading ? 'アップロード中...' : '画像を追加'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
