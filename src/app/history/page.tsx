import HistoryPage from '@/features/history/HistoryPage';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: '飲み切った豆' };
export default function Page() { return <HistoryPage />; }
