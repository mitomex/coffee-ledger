import EditBagPage from '@/features/bag-edit/EditBagPage';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: '豆の情報を編集' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EditBagPage bagId={id} />;
}
