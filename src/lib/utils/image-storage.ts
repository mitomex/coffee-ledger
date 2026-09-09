import { db } from '@/lib/db';
import type { ImageData } from '@/lib/types';
import { logger } from '@/lib/utils/logger';

// セキュリティ設定
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_BASE64_SIZE = 15 * 1024 * 1024; // 15MB (base64は約33%大きくなる)
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/**
 * URLが安全かどうかを簡易的に検証する
 */
function isValidUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    const urlObj = new URL(url);

    // プロトコルチェック
    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
      return false;
    }

    const hostname = urlObj.hostname.toLowerCase();

    // 内部ネットワークアドレスをブロック
    const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0', '[::1]'];
    if (blockedHosts.includes(hostname)) {
      return false;
    }

    // 内部IPアドレスレンジをブロック
    if (hostname.startsWith('10.') ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('172.16.') ||
        hostname.startsWith('172.17.') ||
        hostname.startsWith('172.18.') ||
        hostname.startsWith('172.19.') ||
        hostname.startsWith('172.20.') ||
        hostname.startsWith('172.21.') ||
        hostname.startsWith('172.22.') ||
        hostname.startsWith('172.23.') ||
        hostname.startsWith('172.24.') ||
        hostname.startsWith('172.25.') ||
        hostname.startsWith('172.26.') ||
        hostname.startsWith('172.27.') ||
        hostname.startsWith('172.28.') ||
        hostname.startsWith('172.29.') ||
        hostname.startsWith('172.30.') ||
        hostname.startsWith('172.31.')) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * 画像データをIndexedDBに保存する
 * @param imageData base64形式の画像データ
 * @param id 画像ID（省略時は自動生成）
 * @returns 保存された画像のID
 */
export async function storeImageData(imageData: string, id?: string): Promise<string> {
  if (!imageData || imageData.trim() === '') {
    throw new Error('Image data cannot be empty');
  }

  // base64形式かどうかをチェック
  if (!imageData.startsWith('data:image/') || !imageData.includes(';base64,')) {
    throw new Error('Invalid image data format. Expected base64 data URL.');
  }

  // base64データサイズ検証
  if (imageData.length > MAX_BASE64_SIZE) {
    throw new Error(`Base64 data too large: ${imageData.length} characters (max: ${MAX_BASE64_SIZE})`);
  }

  // MIMEタイプ検証
  const mimeMatch = imageData.match(/^data:(image\/[^;]+);base64,/);
  if (!mimeMatch || !ALLOWED_MIME_TYPES.includes(mimeMatch[1])) {
    throw new Error(`Unsupported image MIME type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`);
  }

  const imageId = id || `img-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

  const imageRecord: ImageData = {
    id: imageId,
    data: imageData,
    createdAt: new Date(),
  };

  await db.images.put(imageRecord);
  return imageId;
}

/**
 * IndexedDBから画像データを取得する
 * @param imageId 画像ID
 * @returns base64形式の画像データ（見つからない場合はnull）
 */
export async function getImageData(imageId: string): Promise<string | null> {
  if (!imageId || imageId.trim() === '') {
    return null;
  }

  try {
    const imageRecord = await db.images.get(imageId);
    return imageRecord ? imageRecord.data : null;
  } catch (error) {
    logger.error('Failed to get image data:', error);
    return null;
  }
}

/**
 * IndexedDBから画像データを削除する
 * @param imageId 画像ID
 */
export async function deleteImageData(imageId: string): Promise<void> {
  if (!imageId || imageId.trim() === '') {
    return;
  }

  try {
    await db.images.delete(imageId);
  } catch (error) {
    logger.error('Failed to delete image data:', error);
  }
}

/**
 * FileオブジェクトをBase64文字列に変換する（高解像度対応）
 * @param file ファイルオブジェクト
 * @param options オプション設定
 * @returns base64形式の画像データ
 */
export async function convertFileToBase64(
  file: File,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    useHighDPI?: boolean;
  } = {}
): Promise<string> {
  // セキュリティ検証
  if (!file) {
    throw new Error('File is required');
  }

  // ファイルサイズ検証
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size too large. Maximum allowed: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }

  // MIMEタイプ検証
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error(`Unsupported file type: ${file.type}. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`);
  }

  // ファイル名検証（パストラバーサル攻撃防止）
  if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
    throw new Error('Invalid file name');
  }

  const {
    maxWidth = 800,
    maxHeight = 600,
    quality = 0.9,
    useHighDPI = true
  } = options;

  // 高解像度処理が有効でブラウザ環境の場合は画像を最適化
  if (useHighDPI && typeof document !== 'undefined') {
    const optimizedBase64 = await optimizeImageToBase64(file, {
      maxWidth: useHighDPI ? maxWidth * 2 : maxWidth,
      maxHeight: useHighDPI ? maxHeight * 2 : maxHeight,
      quality
    });

    if (optimizedBase64) {
      return optimizedBase64;
    }
  }

  // フォールバック: 直接base64変換
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * URL から画像を取得してBase64文字列に変換する
 * @param url 画像URL
 * @param options オプション設定
 * @returns base64形式の画像データ
 */
export async function convertUrlToBase64(
  url: string,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    useHighDPI?: boolean;
  } = {}
): Promise<string> {
  if (!url || url.trim() === '') {
    throw new Error('URL cannot be empty');
  }

  // URL安全性検証
  if (!isValidUrl(url)) {
    throw new Error('Invalid or unsafe URL');
  }

  const {
    maxWidth = 800,    // 高解像度対応: デフォルトを800pxに
    maxHeight = 600,   // 高解像度対応: デフォルトを600pxに
    quality = 0.9,     // 高品質: デフォルトを0.9に
    useHighDPI = true  // 高DPI対応フラグ
  } = options;

  try {
    const blob = await fetchImageDirect(url);

    if (!blob.type.startsWith('image/')) {
      throw new Error('URL does not point to an image');
    }

    // 高解像度処理が有効でブラウザ環境の場合は画像を最適化
    if (useHighDPI && typeof document !== 'undefined') {
      const optimizedBase64 = await optimizeImageToBase64(blob, {
        maxWidth: useHighDPI ? maxWidth * 2 : maxWidth,  // Retina対応で2倍解像度
        maxHeight: useHighDPI ? maxHeight * 2 : maxHeight,
        quality
      });

      if (optimizedBase64) {
        return optimizedBase64;
      }
    }

    // フォールバック: 直接base64変換
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to convert image to base64'));
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read image blob'));
      };

      reader.readAsDataURL(blob);
    });
  } catch (error) {
    throw new Error(`Failed to convert URL to base64: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Blobを最適化してBase64に変換
 */
async function optimizeImageToBase64(
  blob: Blob,
  options: { maxWidth: number; maxHeight: number; quality: number }
): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        // 高解像度対応の寸法計算
        const { width, height } = calculateOptimalDimensions(
          img.width,
          img.height,
          options.maxWidth,
          options.maxHeight
        );

        // Canvas作成（高解像度対応）
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve(null);
          return;
        }

        // Canvas設定
        canvas.width = width;
        canvas.height = height;

        // 高品質レンダリング設定
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // 画像を描画
        ctx.drawImage(img, 0, 0, width, height);

        // Base64に変換
        const dataUrl = canvas.toDataURL('image/jpeg', options.quality);
        resolve(dataUrl);
      } catch (error) {
        logger.warn('Image optimization error:', error);
        resolve(null);
      }
    };

    img.onerror = () => resolve(null);
    img.src = URL.createObjectURL(blob);
  });
}

/**
 * 画像URLを直接取得する。第三者CORSプロキシは使わない。
 */
async function fetchImageDirect(url: string): Promise<Blob> {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'image/*,*/*;q=0.8',
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const blob = await response.blob();

  if (!blob.type.startsWith('image/')) {
    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    if (isValidImageFormat(uint8Array)) {
      const correctMimeType = detectImageMimeType(uint8Array);
      const typedBlob = new Blob([arrayBuffer], { type: correctMimeType });
      if (typedBlob.size > MAX_FILE_SIZE) {
        throw new Error(`Image too large: ${typedBlob.size} bytes (max: ${MAX_FILE_SIZE} bytes)`);
      }
      return typedBlob;
    }

    throw new Error(`Invalid image format: ${blob.type}`);
  }

  if (blob.size > MAX_FILE_SIZE) {
    throw new Error(`Image too large: ${blob.size} bytes (max: ${MAX_FILE_SIZE} bytes)`);
  }

  return blob;
}

/**
 * バイト配列から画像フォーマットを検出
 */
function isValidImageFormat(bytes: Uint8Array): boolean {
  if (bytes.length < 4) return false;

  // JPEG: FF D8 FF
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) return true;

  // PNG: 89 50 4E 47
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return true;

  // GIF: 47 49 46 38
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return true;

  // WebP: 52 49 46 46 ... 57 45 42 50
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes.length > 12 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return true;

  return false;
}

/**
 * バイト配列から正しいMIMEタイプを検出
 */
function detectImageMimeType(bytes: Uint8Array): string {
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) return 'image/jpeg';
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return 'image/png';
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return 'image/gif';
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) return 'image/webp';
  return 'image/jpeg'; // デフォルト
}

/**
 * 最適な画像寸法を計算（高DPI対応）
 */
function calculateOptimalDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  const aspectRatio = originalWidth / originalHeight;

  let width = originalWidth;
  let height = originalHeight;

  // 元画像が小さい場合は品質を保つため拡大しない
  if (originalWidth <= maxWidth && originalHeight <= maxHeight) {
    return { width, height };
  }

  // アスペクト比を保持してリサイズ
  if (width > maxWidth) {
    width = maxWidth;
    height = width / aspectRatio;
  }

  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspectRatio;
  }

  return {
    width: Math.round(width),
    height: Math.round(height)
  };
}

/**
 * 画像IDを持つBagから実際の画像データを取得するヘルパー関数
 * @param imageId 画像ID
 * @returns 表示用の画像URL（base64またはデフォルト画像）
 */
export async function getDisplayImageUrl(imageId?: string): Promise<string> {
  if (!imageId) {
    return '/default-coffee-bean.svg';
  }

  const imageData = await getImageData(imageId);
  return imageData || '/default-coffee-bean.svg';
}