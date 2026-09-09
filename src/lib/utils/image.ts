import { getDisplayImageUrl } from './image-storage';

// デフォルトのコーヒー豆画像
export const DEFAULT_COFFEE_IMAGE = '/default-coffee-bean.svg';

// プレースホルダー画像のURL（外部サービス）
export const PLACEHOLDER_IMAGE = 'https://placehold.co/240x160/F7F3EE/8B7355?text=Coffee+Beans';

/**
 * 画像IDから実際の表示用画像URLを取得する（新しいストレージシステム用）
 * @param imageId 端末保存された画像のID
 * @returns 表示用の画像URL
 */
export async function getValidImageUrl(imageId?: string): Promise<string> {
  return await getDisplayImageUrl(imageId);
}

/**
 * レガシー画像URLをチェックして適切な画像URLを返す（下位互換用）
 * @param imageUrl 従来の画像URL
 * @returns 適切な画像URL
 */
export function getValidImageUrlLegacy(imageUrl: string | undefined): string {
  // 画像URLが未設定またはプレースホルダーの場合、デフォルト画像を使用
  if (!imageUrl || imageUrl === PLACEHOLDER_IMAGE || imageUrl.includes('placehold.co')) {
    return DEFAULT_COFFEE_IMAGE;
  }

  return imageUrl;
}

/**
 * 新規作成時のデフォルト画像URLを取得
 */
export function getDefaultImageUrl(): string {
  return DEFAULT_COFFEE_IMAGE;
}