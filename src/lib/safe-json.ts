/**
 * 安全なJSON解析ユーティリティ
 * プロトタイプ汚染攻撃を防ぐ
 */

/**
 * プロトタイプ汚染を防ぐ安全なJSON.parse
 * __proto__, constructor, prototype などの危険なキーを削除
 */
export function safeJSONParse<T = unknown>(jsonString: string): T | null {
  try {
    const parsed = JSON.parse(jsonString);
    return sanitizeObject(parsed) as T;
  } catch (error) {
    console.warn('JSON parse error:', error);
    return null;
  }
}

/**
 * オブジェクトから危険なプロパティを再帰的に削除
 */
function sanitizeObject(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // 配列の場合
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  // オブジェクトの場合
  const sanitized: Record<string, unknown> = {};
  const dangerousKeys = ['__proto__', 'constructor', 'prototype'];

  for (const key in obj) {
    // hasOwnProperty チェックでプロトタイプチェーンを除外
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      // 危険なキーをスキップ
      if (dangerousKeys.includes(key.toLowerCase())) {
        console.warn(`Dangerous key "${key}" detected and removed`);
        continue;
      }

      // 再帰的にサニタイズ
      sanitized[key] = sanitizeObject((obj as Record<string, unknown>)[key]);
    }
  }

  return sanitized;
}

/**
 * 文字列型の検証
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * オブジェクト型の検証（nullとarrayを除外）
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.prototype.toString.call(value) === '[object Object]'
  );
}

/**
 * Microlink API レスポンスの型検証
 */
export interface MicrolinkData {
  title?: string;
  description?: string;
  text?: string;
  image?: {
    url?: string;
  };
}

export function validateMicrolinkData(data: unknown): data is MicrolinkData {
  if (!isPlainObject(data)) {
    return false;
  }

  // 各プロパティの型チェック
  if (data.title !== undefined && !isString(data.title)) {
    return false;
  }
  if (data.description !== undefined && !isString(data.description)) {
    return false;
  }
  if (data.text !== undefined && !isString(data.text)) {
    return false;
  }
  if (data.image !== undefined) {
    if (!isPlainObject(data.image)) {
      return false;
    }
    if (data.image.url !== undefined && !isString(data.image.url)) {
      return false;
    }
  }

  return true;
}
