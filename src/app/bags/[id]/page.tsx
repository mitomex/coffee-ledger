import DetailPage from '@/features/bag-detail/DetailPage';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: '豆の詳細' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) { 
  const { id } = await params;
  return <DetailPage bagId={id} />; 
}
