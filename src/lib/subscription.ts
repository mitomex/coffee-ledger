import { parseISO, addMonths, format, lastDayOfMonth } from 'date-fns';
import { db } from './db';
import { withNewBagMetadata } from './utils/bag-metadata';
import type { Bag } from './types';

/**
 * 次回配送日を計算（翌月の同じ日）
 * 例: 18日サブスク → 毎月18日
 * 月末考慮: 31日サブスクで2月なら28/29日
 */
export function calculateNextDeliveryDate(
  currentDate: string,
  dayOfMonth: number
): string {
  const current = parseISO(currentDate);

  // 翌月の同じ日を計算
  const nextMonth = addMonths(current, 1);

  // その月の最終日を取得
  const lastDay = lastDayOfMonth(nextMonth);
  const lastDayNum = lastDay.getDate();

  // 指定日がその月に存在しない場合は月末にする
  const targetDay = Math.min(dayOfMonth, lastDayNum);

  return format(
    new Date(nextMonth.getFullYear(), nextMonth.getMonth(), targetDay),
    'yyyy-MM-dd'
  );
}

/**
 * サブスク自動追加チェック
 */
export async function checkAndCreateSubscriptions(): Promise<void> {
  const templates = await db.bags
    .filter(
      (bag) =>
        bag.isSubscriptionTemplate === true &&
        bag.subscriptionInfo?.isActive === true
    )
    .toArray();

  const today = format(new Date(), 'yyyy-MM-dd');

  for (const candidate of templates) {
    await db.transaction('rw', db.bags, async () => {
      // Re-read inside the transaction so concurrent tabs cannot create the same delivery twice.
      const template = await db.bags.get(candidate.id);
      if (!template?.isSubscriptionTemplate || !template.subscriptionInfo?.isActive) return;
      const { nextDeliveryDate, dayOfMonth } = template.subscriptionInfo;
      if (nextDeliveryDate <= today) {
        await createBagFromTemplate(template, nextDeliveryDate);
        await db.bags.update(template.id, {
          'subscriptionInfo.nextDeliveryDate': calculateNextDeliveryDate(nextDeliveryDate, dayOfMonth),
        });
      }
    });
  }
}

/**
 * テンプレートから実際のBagを作成
 */
async function createBagFromTemplate(
  template: Bag,
  purchaseDate: string
): Promise<void> {
  const newBag: Bag = {
    ...template,
    id: `delivery-${template.id}-${purchaseDate}`,
    version: 1,
    updatedAt: new Date().toISOString(),
    purchaseDate,
    remaining_g: template.bagWeight_g,
    consumeLogs: [],
    isSubscriptionTemplate: false,
    subscriptionTemplateId: template.id,
    subscriptionInfo: undefined,
  };

  await db.bags.add(withNewBagMetadata(newBag));
}

/**
 * サブスクリプションを解約
 */
export async function cancelSubscription(bagId: string): Promise<void> {
  const bag = await db.bags.get(bagId);

  if (!bag?.isSubscriptionTemplate) {
    throw new Error('This bag is not a subscription template');
  }

  await db.bags.update(bagId, {
    'subscriptionInfo.isActive': false,
  });
}

/**
 * サブスクリプションを再開
 */
export async function resumeSubscription(
  bagId: string,
  nextDeliveryDate?: string
): Promise<void> {
  const bag = await db.bags.get(bagId);

  if (!bag?.isSubscriptionTemplate) {
    throw new Error('This bag is not a subscription template');
  }

  // 次回配送日が指定されていなければ、今日から次の配送日を計算
  const next =
    nextDeliveryDate ||
    calculateNextDeliveryDate(
      format(new Date(), 'yyyy-MM-dd'),
      bag.subscriptionInfo!.dayOfMonth
    );

  await db.bags.update(bagId, {
    'subscriptionInfo.isActive': true,
    'subscriptionInfo.nextDeliveryDate': next,
  });
}
