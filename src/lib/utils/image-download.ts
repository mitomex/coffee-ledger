// 画像ダウンロードユーティリティ
export interface DownloadedImage {
  localUrl: string;
  originalUrl: string;
  filename: string;
  size: number;
}

/**
 * 外部画像をローカルにダウンロードしてBlob URLを生成
 */
export async function downloadImageToLocal(imageUrl: string): Promise<DownloadedImage | null> {
  try {
    console.log('Downloading image:', imageUrl);

    const response = await fetch(imageUrl, {
      method: 'GET',
      headers: {
        'Accept': 'image/*'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const blob = await response.blob();

    // 画像ファイルかチェック
    if (!blob.type.startsWith('image/')) {
      throw new Error('Not an image file');
    }

    // ファイル名を生成（URL末尾 + タイムスタンプ）
    const urlParts = imageUrl.split('/');
    const originalFilename = urlParts[urlParts.length - 1]?.split('?')[0] || 'image';

    // 既存の拡張子を除去
    const baseFilename = originalFilename.replace(/\.[^.]*$/, '');
    const extension = getImageExtension(blob.type);
    const filename = `coffee_${Date.now()}_${baseFilename}${extension}`;

    // Blob URLを作成
    const localUrl = URL.createObjectURL(blob);

    console.log('Image downloaded successfully:', filename, blob.size, 'bytes');

    return {
      localUrl,
      originalUrl: imageUrl,
      filename,
      size: blob.size
    };

  } catch (error) {
    console.warn('Failed to download image:', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

/**
 * MIMEタイプから適切な拡張子を取得
 */
function getImageExtension(mimeType: string): string {
  const extensionMap: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/svg+xml': '.svg',
    'image/bmp': '.bmp'
  };

  return extensionMap[mimeType] || '.jpg';
}

/**
 * Blob URLをクリーンアップ
 */
export function revokeImageUrl(url: string): void {
  if (url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}

/**
 * 画像のダウンロードとリサイズ（オプション）
 */
export async function downloadAndResizeImage(
  imageUrl: string,
  maxWidth: number = 400,
  maxHeight: number = 300,
  quality: number = 0.8
): Promise<DownloadedImage | null> {
  try {
    const downloaded = await downloadImageToLocal(imageUrl);
    if (!downloaded) return null;

    // Canvasでリサイズ
    const resizedBlob = await resizeImageBlob(downloaded.localUrl, maxWidth, maxHeight, quality);
    if (!resizedBlob) return downloaded; // リサイズ失敗時は元画像を返す

    // 古いBlog URLをクリーンアップ
    revokeImageUrl(downloaded.localUrl);

    // 新しいBlob URLを作成
    const resizedUrl = URL.createObjectURL(resizedBlob);

    return {
      ...downloaded,
      localUrl: resizedUrl,
      size: resizedBlob.size,
      filename: downloaded.filename.replace(/\.([^.]+)$/, '_resized.$1')
    };

  } catch (error) {
    console.warn('Failed to resize image:', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

/**
 * 画像をCanvasでリサイズしてBlobを返す
 */
async function resizeImageBlob(
  imageUrl: string,
  maxWidth: number,
  maxHeight: number,
  quality: number
): Promise<Blob | null> {
  // Node.js環境やCanvasが利用できない場合はリサイズをスキップ
  if (typeof document === 'undefined' || typeof HTMLCanvasElement === 'undefined') {
    console.warn('Canvas not available, skipping resize');
    return null;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        // アスペクト比を保持してリサイズ計算
        const { width, height } = calculateResizeDimensions(
          img.width,
          img.height,
          maxWidth,
          maxHeight
        );

        // Canvas作成
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }

        canvas.width = width;
        canvas.height = height;

        // 画像を描画
        ctx.drawImage(img, 0, 0, width, height);

        // Blobに変換
        canvas.toBlob(
          (blob) => resolve(blob),
          'image/jpeg',
          quality
        );
      } catch (error) {
        console.warn('Resize error:', error);
        resolve(null);
      }
    };

    img.onerror = () => resolve(null);
    img.src = imageUrl;
  });
}

/**
 * アスペクト比を保持したリサイズ寸法を計算
 */
function calculateResizeDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  const aspectRatio = originalWidth / originalHeight;

  let width = originalWidth;
  let height = originalHeight;

  // 最大幅を超える場合
  if (width > maxWidth) {
    width = maxWidth;
    height = width / aspectRatio;
  }

  // 最大高さを超える場合
  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspectRatio;
  }

  return {
    width: Math.round(width),
    height: Math.round(height)
  };
}