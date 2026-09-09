import type { Bag } from '@/lib/types';

export type RecommendationType = 'elegance' | 'heritage' | 'discovery';

export interface RecommendationCriteria {
  process?: string[];
  variety?: string[];
  roaster?: string[];
  priority: number;
}

// 各ラベルの推奨基準
const RECOMMENDATION_CRITERIA: Record<RecommendationType, RecommendationCriteria> = {
  elegance: {
    process: ['Washed'],
    variety: ['ゲイシャ', 'ブルボン', 'カトゥーラ'],
    roaster: ['Light Up Coffee', 'Kurasu Kyoto', 'Blue Bottle Coffee'],
    priority: 1
  },
  heritage: {
    process: ['Honey', 'Natural'],
    variety: ['ブルボン', 'カトゥーラ', 'パカマラ'],
    roaster: ['Coffee Mameya', 'Glitch Coffee', 'Blue Bottle Coffee'],
    priority: 2
  },
  discovery: {
    process: ['Anaerobic'],
    variety: ['ゲイシャ', 'パカマラ', 'SL28', 'SL34'],
    roaster: ['Glitch Coffee', 'Coffee Mameya'],
    priority: 3
  }
};

// 豆のスコアを計算
function calculateBagScore(bag: Bag, criteria: RecommendationCriteria): number {
  let score = 0;

  // プロセス一致（高優先度）
  if (criteria.process && criteria.process.includes(bag.process)) {
    score += 10;
  }

  // 品種一致（中優先度）
  if (criteria.variety && bag.variety && criteria.variety.includes(bag.variety)) {
    score += 5;
  }

  // ロースター一致（中優先度）
  if (criteria.roaster && criteria.roaster.includes(bag.roaster)) {
    score += 3;
  }

  // 残量による調整（残量が多いほど高スコア）
  const remainingRatio = bag.remaining_g / bag.bagWeight_g;
  score += remainingRatio * 2;

  // 日付による調整（新しいほど高スコア）
  const date = new Date(bag.roastDate || bag.purchaseDate);
  const daysSince = Math.floor((new Date().getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (daysSince <= 30) {
    score += 2;
  } else if (daysSince <= 60) {
    score += 1;
  }

  return score;
}

// 特定のタイプに最適な豆を選択
export function selectBestBagForType(bags: Bag[], type: RecommendationType): Bag | null {
  const criteria = RECOMMENDATION_CRITERIA[type];
  const scoredBags = bags
    .map(bag => ({
      bag,
      score: calculateBagScore(bag, criteria)
    }))
    .filter(item => item.score > 0) // 最低限のスコアがあるもののみ
    .sort((a, b) => b.score - a.score);

  return scoredBags.length > 0 ? scoredBags[0].bag : null;
}

// 3つのラベルに最適な豆を選択（重複を避ける）
export function selectRecommendations(bags: Bag[]): { type: RecommendationType; bag: Bag | null }[] {
  const results: { type: RecommendationType; bag: Bag | null }[] = [];
  const usedBagIds = new Set<string>();

  // 優先度順に処理
  const types: RecommendationType[] = ['elegance', 'heritage', 'discovery'];
  
  for (const type of types) {
    const availableBags = bags.filter(bag => !usedBagIds.has(bag.id));
    const bestBag = selectBestBagForType(availableBags, type);
    
    if (bestBag) {
      usedBagIds.add(bestBag.id);
    }
    
    results.push({ type, bag: bestBag });
  }

  return results;
}

// フォールバック用：スコアが低い場合の代替選択
export function selectFallbackRecommendations(bags: Bag[]): Bag[] {
  // 日付でソート（新しい順）
  const dateSorted = bags
    .map(bag => ({
      bag,
      date: new Date(bag.roastDate || bag.purchaseDate)
    }))
    .sort((a, b) => {
      return b.date.getTime() - a.date.getTime();
    });

  return dateSorted.slice(0, 3).map(item => item.bag);
}
