import DetailPage from '@/features/bag-detail/DetailPage';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: '抽出記録を編集' };

export default async function Page({ params }: { params: Promise<{ id: string; logId: string }> }) {
  const { id, logId } = await params;
  return <DetailPage bagId={id} editLogId={logId} />;
}
