import type { Bag, Process } from '@/lib/types'
import { withNewBagMetadata } from '@/lib/utils/bag-metadata'
import { calculateNextDeliveryDate } from '@/lib/subscription'

export interface NewBagForm {
  name: string
  roaster: string
  priceJPY: string
  bagWeight_g: string
  roastDate: string
  purchaseDate: string
  process: string
  variety: string
  farm?: string
  country?: string
  notes: string
  bagDose_g: string

  // セット商品フィールド
  isSet?: boolean
  setTotalPriceJPY?: string
  setPurchaseDate?: string
  setTotalWeight_g?: string

  // サブスクリプションフィールド
  isSubscription?: boolean
  subscriptionDayOfMonth?: number
}

export function validateForm(form: NewBagForm): string[] {
  const missing: string[] = []

  if (!form.purchaseDate) missing.push('購入日')

  if (form.isSet) {
    // セット商品の場合
    if (!form.setTotalPriceJPY) missing.push('セット価格')
  } else {
    // 通常の袋の場合
    if (!form.bagWeight_g) missing.push('袋重量')
  }

  return missing
}

export function createBagFromForm(form: NewBagForm, imageId?: string): Bag {
  const processValue = form.process?.trim() ?? ''

  if (form.isSet) {
    // 親Bag（セット商品）の場合
    const parentBag: Bag = {
      id: `bag-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      name: form.name || '未設定',
      roaster: form.roaster || '未設定',
      process: (processValue || '') as Process,
      variety: form.variety || undefined,
      farm: form.farm || undefined,
      country: form.country || undefined,
      roastDate: form.roastDate || undefined,
      purchaseDate: form.purchaseDate,
      bagWeight_g: form.setTotalWeight_g ? Number(form.setTotalWeight_g) : 0,
      priceJPY: undefined, // セット商品は個別価格を持たない
      remaining_g: 0, // セット商品は消費しない
      bagDose_g: form.bagDose_g ? Number(form.bagDose_g) : undefined,
      imageId: imageId,
      notes: form.notes || undefined,
      consumeLogs: [],
      isSet: true,
      childBagIds: [],
      setInfo: {
        totalPriceJPY: Number(form.setTotalPriceJPY) || 0,
        purchaseDate: form.setPurchaseDate || form.purchaseDate,
        totalWeight_g: form.setTotalWeight_g ? Number(form.setTotalWeight_g) : undefined,
      },
    }
    return withNewBagMetadata(parentBag)
  }

  // 通常のBag
  const baseBag: Bag = {
    id: `bag-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
    name: form.name || '未設定',
    roaster: form.roaster || '未設定',
    process: (processValue || '') as Process,
    variety: form.variety || undefined,
    farm: form.farm || undefined,
    country: form.country || undefined,
    roastDate: form.roastDate || undefined,
    purchaseDate: form.purchaseDate,
    bagWeight_g: Number(form.bagWeight_g) || 0,
    priceJPY: form.priceJPY ? Number(form.priceJPY) : undefined,
    remaining_g: Number(form.bagWeight_g) || 0,
    bagDose_g: form.bagDose_g ? Number(form.bagDose_g) : undefined,
    imageId: imageId,
    notes: form.notes || undefined,
    consumeLogs: [],
  }

  // サブスクリプションの場合
  if (form.isSubscription && form.subscriptionDayOfMonth) {
    const dayOfMonth = form.subscriptionDayOfMonth;
    const nextDeliveryDate = calculateNextDeliveryDate(form.purchaseDate, dayOfMonth);

    return withNewBagMetadata({
      ...baseBag,
      isSubscriptionTemplate: true,
      subscriptionInfo: {
        dayOfMonth,
        nextDeliveryDate,
        isActive: true,
        startDate: form.purchaseDate,
      },
    });
  }

  return withNewBagMetadata(baseBag)
}
