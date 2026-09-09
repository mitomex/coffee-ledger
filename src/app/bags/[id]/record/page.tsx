import RecordExtractionPage from '@/features/bag-detail/RecordExtractionPage';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: '抽出を記録' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RecordExtractionPage bagId={id} />;
}
