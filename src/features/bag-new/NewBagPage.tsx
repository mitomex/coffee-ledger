'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SuccessModal } from '@/components/ui/success-modal';
import { ArrowLeft } from 'lucide-react';
import { db } from '@/lib/db';
import { validateForm, createBagFromForm } from './utils/form-validation'
import type { NewBagForm } from './utils/form-validation';
import { storeImageData, convertFileToBase64 } from '@/lib/utils/image-storage';
import { SiteWordmark } from '@/components/SiteWordmark';
import { BagFormGrid } from './components/BagFormGrid';

export default function NewBagPage(){
  const router = useRouter();
  const [form, setForm] = useState<NewBagForm>({
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
  });
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [savedBagId, setSavedBagId] = useState<string>('');
  const [customProcess, setCustomProcess] = useState(false);
  const [customProcessValue, setCustomProcessValue] = useState('');
  const [imageUploading, setImageUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImageUploading(true);
    try {
      // プレビュー用のURLを作成
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
      setImageFile(file);
    } catch (error) {
      console.error('Failed to process image:', error);
      alert('画像の処理に失敗しました');
    } finally {
      setImageUploading(false);
    }
  };

  const handleRemoveImage = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
    setImageFile(null);
  };

  const missing = validateForm(form);

  async function handleSave(){
    if (missing.length > 0) return;

    try {
      let imageId: string | undefined = undefined;

      // 画像がアップロードされている場合は保存
      if (imageFile) {
        const base64Data = await convertFileToBase64(imageFile, {
          maxWidth: 800,
          maxHeight: 600,
          quality: 0.9,
          useHighDPI: true
        });
        imageId = await storeImageData(base64Data);
      }

      const newBag = createBagFromForm(form, imageId);
      await db.bags.add(newBag);

      // クリーンアップ
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }

      // 成功モーダルを表示
      setSavedBagId(newBag.id);
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Failed to save bag:', error);
      alert('保存に失敗しました');
    }
  }

  function handleModalClose() {
    setShowSuccessModal(false);
    router.push(`/bags/${savedBagId}`);
  }

  return (
    <div className="page-shell">
      <div className="page-shell__content flex flex-col gap-12 w-full">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between w-full">
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
        <main id="main-content" tabIndex={-1} className="w-full space-y-6 sm:space-y-12">
          <section className="w-full">
            <h1 className="text-[18px] sm:text-[20px] font-semibold tracking-tight mb-3 sm:mb-4">新規登録</h1>
            <Card className="w-full py-0 rounded-md bg-white border border-border/70 shadow-sm">
              <CardContent className="p-4 sm:p-5 space-y-4 sm:space-y-5">
                <BagFormGrid
                  form={form}
                  setForm={setForm}
                  missing={missing}
                  customProcess={customProcess}
                  setCustomProcess={setCustomProcess}
                  customProcessValue={customProcessValue}
                  setCustomProcessValue={setCustomProcessValue}
                  imagePreview={imagePreview}
                  onImageUpload={handleImageUpload}
                  onRemoveImage={handleRemoveImage}
                  imageUploading={imageUploading}
                />

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
                  <div className="text-[11px] sm:text-[12px] text-muted-foreground">{form.isSet ? '必須は「購入日」と「セット価格」です。' : '必須は「購入日」と「袋重量」。焙煎日は到着後に入力できます。'}</div>
                  <Button className="w-full sm:w-auto tracking-[0.1em] disabled:opacity-40" disabled={missing.length>0} aria-describedby="bag-required-summary" onClick={handleSave}>
                    保存{missing.length>0 ? `（残り${missing.length}）` : ''}
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
        message="コーヒー豆を登録しました"
      />
    </div>
  );
}
