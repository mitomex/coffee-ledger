import AddChildBagPage from '@/features/bag-set/AddChildBagPage';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'セット内容を追加' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AddChildBagPage parentId={id} />;
}
