import type { Bag, ConsumeLog } from '../types';
import { ROASTER_TEMPLATES } from '../roaster-templates';

export const resolveDose = (appDose: number, roaster: string, bagDose?: number) =>
  bagDose ?? ROASTER_TEMPLATES[roaster]?.dose_g ?? appDose;

export const cupsLeft = (remaining_g: number, dose_g: number) =>
  Math.floor(remaining_g / Math.max(1, dose_g));

export const dateLabel = (b: Bag) =>
  b.roastDate ? `${b.roastDate}（焙煎）` : `${b.purchaseDate}（購入）`;

export const formatJPY = (n?: number) =>
  typeof n === 'number' ? n.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 }) : undefined;

export const isArchived = (b: Bag) => (b.remaining_g || 0) <= 0;

export const isPeak = (bag: Bag, today = new Date()) => {
  if (!bag.roastDate) return false;
  const r = new Date(bag.roastDate);
  const start = new Date(r); start.setDate(r.getDate() + 7);
  const end = new Date(r);   end.setMonth(r.getMonth() + 3);
  return today >= start && today <= end;
};

export const todayYMD = () => new Date().toISOString().slice(0, 10);
export const toJP = (d: string) => new Date(d).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });

export const sumConsumedLogs = (b: Bag) =>
  (b.consumeLogs as ConsumeLog[]).filter(l => l.reducesStock).reduce((s, l) => s + l.grams, 0);
