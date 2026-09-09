/**
 * ロガーユーティリティ
 * 本番環境では console.log を出力しない
 * エラーは本番環境でも出力する
 */

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
  // 開発環境でのみ出力
  log: isDevelopment ? console.log.bind(console) : () => {},
  info: isDevelopment ? console.info.bind(console) : () => {},
  debug: isDevelopment ? console.debug.bind(console) : () => {},
  warn: isDevelopment ? console.warn.bind(console) : () => {},

  // エラーは本番環境でも出力（ただしより制御された形で）
  error: (...args: unknown[]) => {
    if (isDevelopment) {
      console.error(...args);
    } else {
      // 本番環境では、エラー監視サービスに送信することも可能
      // 例: Sentry.captureException(args[0])
      console.error('[ERROR]', ...args);
    }
  },

  // グループ化されたログ（開発環境のみ）
  group: isDevelopment ? console.group.bind(console) : () => {},
  groupEnd: isDevelopment ? console.groupEnd.bind(console) : () => {},

  // テーブル形式のログ（開発環境のみ）
  table: isDevelopment ? console.table.bind(console) : () => {},

  // パフォーマンス測定（開発環境のみ）
  time: isDevelopment ? console.time.bind(console) : () => {},
  timeEnd: isDevelopment ? console.timeEnd.bind(console) : () => {},
};

export default logger;