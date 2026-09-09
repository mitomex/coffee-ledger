import { describe, it, expect } from '@jest/globals';
import {
  calculateNextDeliveryDate,
} from '../subscription';

describe('calculateNextDeliveryDate', () => {
  it('通常月の翌月同日を計算する（例：1月18日 → 2月18日）', () => {
    const result = calculateNextDeliveryDate('2025-01-18', 18);
    expect(result).toBe('2025-02-18');
  });

  it('月末を超える場合は月末日にする（例：1月31日 → 2月28日）', () => {
    const result = calculateNextDeliveryDate('2025-01-31', 31);
    expect(result).toBe('2025-02-28');
  });

  it('うるう年の2月を正しく扱う（例：1月31日 → 2月29日 in 2024）', () => {
    const result = calculateNextDeliveryDate('2024-01-31', 31);
    expect(result).toBe('2024-02-29');
  });

  it('年をまたぐ計算（例：12月18日 → 1月18日）', () => {
    const result = calculateNextDeliveryDate('2024-12-18', 18);
    expect(result).toBe('2025-01-18');
  });

  it('月の途中から次月を計算（例：2月5日だが18日サブスク → 3月18日）', () => {
    const result = calculateNextDeliveryDate('2025-02-05', 18);
    expect(result).toBe('2025-03-18');
  });
});
