import ExtractionDetailPage from '@/features/bag-detail/ExtractionDetailPage';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: '抽出記録' };

export default async function Page({ params }: { params: Promise<{ id: string; logId: string }> }) {
  const { id, logId } = await params;
  return <ExtractionDetailPage bagId={id} logId={logId} />;
}
