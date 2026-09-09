'use client';

import { useEffect } from 'react';
import { checkAndCreateSubscriptions } from '@/lib/subscription';

/**
 * アプリ起動時にサブスクリプションの自動追加をチェックするコンポーネント
 */
export default function SubscriptionChecker() {
  useEffect(() => {
    // アプリ起動時にサブスクリプションをチェック
    checkAndCreateSubscriptions().then(() => {
      window.dispatchEvent(new Event('coffee-ledger:subscriptions-updated'));
    }).catch((error) => {
      console.error('Failed to check subscriptions:', error);
    });
  }, []);

  return null;
}
