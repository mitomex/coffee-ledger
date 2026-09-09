import HomePage from '@/features/home/HomePage'
import type { Metadata } from 'next';

// The root layout's title template does not reach the page in its own segment,
// so the home route spells out the app name itself.
export const metadata: Metadata = { title: '在庫一覧 | Coffee Ledger' };

export default function Page() {
  return <HomePage />
}
