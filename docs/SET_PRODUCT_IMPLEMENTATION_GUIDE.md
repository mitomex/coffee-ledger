# セット商品機能 実装手順書

## 📋 目次
1. [前提条件と現状分析](#前提条件と現状分析)
2. [実装スコープ](#実装スコープ)
3. [実装手順（TDDベース）](#実装手順tddベース)
4. [各ステップの詳細](#各ステップの詳細)
5. [テスト戦略](#テスト戦略)
6. [完了チェックリスト](#完了チェックリスト)

---

## 前提条件と現状分析

### ✅ 既に実装済み
- `AddChildBagPage` コンポーネント（子Bag登録）
- `AddChildBagPage` のテスト
- `/bags/[id]/set/add` ルート
- 価格均等割機能
- 親子関係の基本的なデータ構造（テストで使用中）

### ❌ 未実装・不足している部分
1. `types.ts` に型定義がない（`isSet`, `parentBagId`, `childBagIds`, `setInfo`）
2. 新規登録フォーム（`NewBagPage`）にセット商品入力UIがない
3. 詳細画面（`DetailPage`）にセット情報表示がない
4. 詳細画面に「セット内容を追加」ボタンがない
5. ホームページで親Bagを非表示にするロジックがない
6. 削除時の親子関係処理がない

---

## 実装スコープ

### Phase 1: 基本機能（本手順書の対象）
以下の機能を実装します：

1. **データモデル拡張**
   - `types.ts` に型定義追加
   - データベーススキーマは変更不要（オプショナルフィールド）

2. **親Bag登録UI**
   - `NewBagPage` にセット商品チェックボックス追加
   - セット情報入力フォーム（価格、購入日、合計重量）

3. **詳細画面の拡張**
   - 親Bagの場合：セット情報表示とセット内容リスト
   - 子Bagの場合：親セットへのリンク
   - 「セット内容を追加」ボタン

4. **一覧画面の調整**
   - 親Bagをデフォルトで非表示
   - 子Bagに視覚的インジケーター追加

5. **削除処理**
   - 親Bag削除時の確認ダイアログ
   - 子Bag削除時の親`childBagIds`更新

---

## 実装手順（TDDベース）

### 🔴 TDD原則の厳守

**TDD三原則:**
1. 失敗するテストを成功させる以外の目的で実装コードを書いてはならない
2. コンパイルが通らず、失敗するテストを作る以外の目的でテストコードを書いてはならない
3. 現在失敗しているテストを成功させる以外の目的で実装コードを書いてはならない

### 実装順序（依存関係に基づく）

```
Step 1: データモデル（型定義）
  ↓
Step 2: form-validation ユーティリティ
  ↓
Step 3: 親Bag登録UI（NewBagPage）
  ↓
Step 4: 詳細画面の拡張（親Bag表示）
  ↓
Step 5: 詳細画面の拡張（子Bag表示）
  ↓
Step 6: ホームページのフィルタリング
  ↓
Step 7: 削除処理
```

---

## 各ステップの詳細

### Step 1: データモデル拡張（型定義）

#### 1.1 🔴 RED: テストを書く

**ファイル:** `src/lib/__tests__/types.test.ts`（新規作成）

```typescript
import type { Bag } from '../types';

describe('Bag type with set product fields', () => {
  it('should allow isSet field', () => {
    const parentBag: Bag = {
      id: 'test-1',
      name: 'Test Set',
      roaster: 'Test Roaster',
      process: 'Washed',
      purchaseDate: '2025-09-01',
      bagWeight_g: 600,
      remaining_g: 0,
      consumeLogs: [],
      isSet: true, // ←コンパイルエラーになることを確認
      childBagIds: [],
    };
    expect(parentBag.isSet).toBe(true);
  });

  it('should allow setInfo field', () => {
    const parentBag: Bag = {
      id: 'test-1',
      name: 'Test Set',
      roaster: 'Test Roaster',
      process: 'Washed',
      purchaseDate: '2025-09-01',
      bagWeight_g: 600,
      remaining_g: 0,
      consumeLogs: [],
      isSet: true,
      setInfo: { // ←コンパイルエラーになることを確認
        totalPriceJPY: 6000,
        purchaseDate: '2025-09-01',
        totalWeight_g: 600,
      },
    };
    expect(parentBag.setInfo?.totalPriceJPY).toBe(6000);
  });

  it('should allow parentBagId field for child bags', () => {
    const childBag: Bag = {
      id: 'test-child-1',
      name: 'Test Child',
      roaster: 'Test Roaster',
      process: 'Washed',
      purchaseDate: '2025-09-01',
      bagWeight_g: 200,
      remaining_g: 200,
      consumeLogs: [],
      parentBagId: 'test-1', // ←コンパイルエラーになることを確認
    };
    expect(childBag.parentBagId).toBe('test-1');
  });
});
```

**実行:**
```bash
npm test src/lib/__tests__/types.test.ts
# → コンパイルエラーで失敗することを確認（RED）
```

#### 1.2 🟢 GREEN: 最小限の実装

**ファイル:** `src/lib/types.ts`

```typescript
export interface Bag {
  // 既存フィールド...
  id: string;
  name: string;
  roaster: string;
  process: Process;
  variety?: string;
  roastDate?: string;
  purchaseDate: string;
  bagWeight_g: number;
  priceJPY?: number;
  remaining_g: number;
  bagDose_g?: number;
  imageId?: string;
  image?: string;
  notes?: string;
  consumeLogs: ConsumeLog[];
  version?: number;
  updatedAt?: string;
  deviceId?: string;

  // 新規フィールド: セット商品管理
  isSet?: boolean;              // セット商品かどうか
  parentBagId?: string;         // 親セットのID（子Bagの場合のみ）
  childBagIds?: string[];       // 子BagのIDリスト（親Bagの場合のみ）
  setInfo?: {
    totalPriceJPY: number;      // セット全体の購入価格
    purchaseDate: string;       // セットの購入日
    totalWeight_g?: number;     // セット全体の重量（オプション）
  };
}
```

**実行:**
```bash
npm test src/lib/__tests__/types.test.ts
# → テストが成功することを確認（GREEN）
```

#### 1.3 🔄 REFACTOR: リファクタリング

- 必要に応じてコメントを追加
- 型定義の整合性を確認
- テストが引き続き通ることを確認

---

### Step 2: form-validation ユーティリティの拡張

#### 2.1 🔴 RED: テストを書く

**ファイル:** `src/features/bag-new/utils/__tests__/form-validation.test.ts`（既存ファイルに追加）

```typescript
import { validateForm, createBagFromForm } from '../form-validation';
import type { NewBagForm } from '../form-validation';

describe('form-validation with set product support', () => {
  describe('validateForm', () => {
    it('should validate set bag fields when isSet is true', () => {
      const form: NewBagForm = {
        name: '',
        roaster: '',
        priceJPY: '',
        bagWeight_g: '',
        roastDate: '',
        purchaseDate: '2025-09-01',
        process: '',
        variety: '',
        notes: '',
        bagDose_g: '',
        isSet: true,
        setTotalPriceJPY: '', // ←エラー: フィールドが存在しない
        setPurchaseDate: '',
        setTotalWeight_g: '',
      };

      const missing = validateForm(form);
      expect(missing).toContain('セット価格');
    });
  });

  describe('createBagFromForm', () => {
    it('should create parent bag when isSet is true', () => {
      const form: NewBagForm = {
        name: 'Test Set',
        roaster: 'Test Roaster',
        priceJPY: '',
        bagWeight_g: '600',
        roastDate: '',
        purchaseDate: '2025-09-01',
        process: 'Washed',
        variety: '',
        notes: '',
        bagDose_g: '',
        isSet: true,
        setTotalPriceJPY: '6000',
        setPurchaseDate: '2025-09-01',
        setTotalWeight_g: '600',
      };

      const bag = createBagFromForm(form);

      expect(bag.isSet).toBe(true);
      expect(bag.childBagIds).toEqual([]);
      expect(bag.remaining_g).toBe(0);
      expect(bag.setInfo).toEqual({
        totalPriceJPY: 6000,
        purchaseDate: '2025-09-01',
        totalWeight_g: 600,
      });
    });

    it('should create normal bag when isSet is false', () => {
      const form: NewBagForm = {
        name: 'Test Bag',
        roaster: 'Test Roaster',
        priceJPY: '2000',
        bagWeight_g: '200',
        roastDate: '',
        purchaseDate: '2025-09-01',
        process: 'Washed',
        variety: '',
        notes: '',
        bagDose_g: '',
        isSet: false,
        setTotalPriceJPY: '',
        setPurchaseDate: '',
        setTotalWeight_g: '',
      };

      const bag = createBagFromForm(form);

      expect(bag.isSet).toBeUndefined();
      expect(bag.remaining_g).toBe(200);
    });
  });
});
```

**実行:**
```bash
npm test src/features/bag-new/utils/__tests__/form-validation.test.ts
# → コンパイルエラーまたは実行時エラーで失敗（RED）
```

#### 2.2 🟢 GREEN: 最小限の実装

**ファイル:** `src/features/bag-new/utils/form-validation.ts`

```typescript
import type { Bag, Process } from '@/lib/types'
import { withNewBagMetadata } from '@/lib/utils/bag-metadata'

export interface NewBagForm {
  name: string
  roaster: string
  priceJPY: string
  bagWeight_g: string
  roastDate: string
  purchaseDate: string
  process: string
  variety: string
  notes: string
  bagDose_g: string

  // セット商品フィールド
  isSet?: boolean
  setTotalPriceJPY?: string
  setPurchaseDate?: string
  setTotalWeight_g?: string
}

export interface ExtractedData {
  name?: string
  roaster?: string
  priceJPY?: number
  process?: string
  variety?: string
  notes?: string
  image?: string
  bagWeight_g?: number
}

export function validateForm(form: NewBagForm): string[] {
  const missing: string[] = []

  if (!form.purchaseDate) missing.push('購入日')

  if (form.isSet) {
    // セット商品の場合
    if (!form.setTotalPriceJPY) missing.push('セット価格')
  } else {
    // 通常の袋の場合
    if (!form.bagWeight_g) missing.push('袋重量')
  }

  return missing
}

export function createBagFromForm(form: NewBagForm, _extracted?: ExtractedData | null, imageId?: string): Bag {
  const processValue = form.process?.trim() ?? ''

  if (form.isSet) {
    // 親Bag（セット商品）の場合
    const parentBag: Bag = {
      id: `bag-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      name: form.name || '未設定',
      roaster: form.roaster || '未設定',
      process: (processValue || '') as Process,
      variety: form.variety || undefined,
      roastDate: form.roastDate || undefined,
      purchaseDate: form.purchaseDate,
      bagWeight_g: form.setTotalWeight_g ? Number(form.setTotalWeight_g) : 0,
      priceJPY: undefined, // セット商品は個別価格を持たない
      remaining_g: 0, // セット商品は消費しない
      bagDose_g: form.bagDose_g ? Number(form.bagDose_g) : undefined,
      imageId: imageId,
      image: _extracted?.image,
      notes: form.notes || undefined,
      consumeLogs: [],
      isSet: true,
      childBagIds: [],
      setInfo: {
        totalPriceJPY: Number(form.setTotalPriceJPY) || 0,
        purchaseDate: form.setPurchaseDate || form.purchaseDate,
        totalWeight_g: form.setTotalWeight_g ? Number(form.setTotalWeight_g) : undefined,
      },
    }
    return withNewBagMetadata(parentBag)
  }

  // 通常のBag
  const baseBag: Bag = {
    id: `bag-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
    name: form.name || '未設定',
    roaster: form.roaster || '未設定',
    process: (processValue || '') as Process,
    variety: form.variety || undefined,
    roastDate: form.roastDate || undefined,
    purchaseDate: form.purchaseDate,
    bagWeight_g: Number(form.bagWeight_g) || 0,
    priceJPY: form.priceJPY ? Number(form.priceJPY) : undefined,
    remaining_g: Number(form.bagWeight_g) || 0,
    bagDose_g: form.bagDose_g ? Number(form.bagDose_g) : undefined,
    imageId: imageId,
    image: _extracted?.image,
    notes: form.notes || undefined,
    consumeLogs: [],
  }

  return withNewBagMetadata(baseBag)
}

export function mergeExtractedData(form: NewBagForm, extracted: ExtractedData): NewBagForm {
  return {
    ...form,
    name: extracted.name || form.name,
    roaster: extracted.roaster || form.roaster,
    priceJPY: extracted.priceJPY ? String(extracted.priceJPY) : form.priceJPY,
    process: extracted.process || form.process,
    variety: extracted.variety || form.variety,
    notes: extracted.notes || form.notes,
    bagWeight_g: extracted.bagWeight_g ? String(extracted.bagWeight_g) : form.bagWeight_g,
  }
}
```

**実行:**
```bash
npm test src/features/bag-new/utils/__tests__/form-validation.test.ts
# → テストが成功することを確認（GREEN）
```

---

### Step 3: 親Bag登録UI（NewBagPage）

#### 3.1 🔴 RED: テストを書く

**ファイル:** `src/features/bag-new/__tests__/NewBagPage.test.tsx`（既存ファイルに追加）

```typescript
describe('NewBagPage - Set Product Features', () => {
  it('should show set product checkbox', () => {
    render(<NewBagPage />)

    expect(screen.getByLabelText('セット商品')).toBeInTheDocument()
  })

  it('should show set-specific fields when checkbox is checked', async () => {
    const user = userEvent.setup()
    render(<NewBagPage />)

    const setCheckbox = screen.getByLabelText('セット商品')
    await user.click(setCheckbox)

    expect(screen.getByLabelText('セット価格（¥・必須）')).toBeInTheDocument()
    expect(screen.getByLabelText('セット合計重量（g・任意）')).toBeInTheDocument()
    expect(screen.queryByLabelText('袋重量（g・必須）')).not.toBeInTheDocument()
  })

  it('should save parent bag when set product is checked', async () => {
    const user = userEvent.setup()
    const mockAdd = jest.mocked(db.bags.add)
    mockAdd.mockResolvedValue('parent-123')

    render(<NewBagPage />)

    await user.click(screen.getByLabelText('セット商品'))
    await user.type(screen.getByLabelText('名前'), 'Test Set')
    await user.type(screen.getByLabelText('ロースター'), 'Test Roaster')
    await user.type(screen.getByLabelText('購入日（必須）'), '2025-09-01')
    await user.type(screen.getByLabelText('セット価格（¥・必須）'), '6000')

    const saveButton = screen.getByRole('button', { name: /保存/ })
    await user.click(saveButton)

    await waitFor(() => {
      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          isSet: true,
          childBagIds: [],
          remaining_g: 0,
          setInfo: expect.objectContaining({
            totalPriceJPY: 6000,
          }),
        })
      )
    })
  })
})
```

**実行:**
```bash
npm test src/features/bag-new/__tests__/NewBagPage.test.tsx
# → テストが失敗することを確認（RED）
```

#### 3.2 🟢 GREEN: 最小限の実装

**ファイル:** `src/features/bag-new/NewBagPage.tsx`（既存ファイルを編集）

状態とフォームフィールドを追加:

```typescript
const [form, setForm] = useState<NewBagForm>({
  name: '',
  roaster: '',
  priceJPY: '',
  bagWeight_g: '',
  roastDate: '',
  purchaseDate: '',
  process: '',
  variety: '',
  notes: '',
  bagDose_g: '',
  isSet: false,              // 追加
  setTotalPriceJPY: '',      // 追加
  setPurchaseDate: '',       // 追加
  setTotalWeight_g: '',      // 追加
});
```

JSX内にチェックボックスとセット商品フィールドを追加（該当箇所を探して挿入）:

```tsx
{/* セット商品チェックボックス */}
<div className="sm:col-span-2">
  <label className="flex items-center gap-2 text-[13px] text-muted-foreground">
    <input
      type="checkbox"
      checked={form.isSet}
      onChange={(e) => setForm({ ...form, isSet: e.target.checked })}
      className="rounded border-border/70"
    />
    セット商品
  </label>
  <p className="mt-1 text-[11px] text-muted-foreground">
    複数のコーヒー豆がセットになっている商品の場合はチェックしてください
  </p>
</div>

{/* セット商品の場合の専用フィールド */}
{form.isSet ? (
  <>
    <div>
      <label className="block text-[13px] text-muted-foreground mb-1">
        セット価格（¥・必須）
      </label>
      <input
        type="number"
        inputMode="numeric"
        value={form.setTotalPriceJPY}
        onChange={(e) => setForm({ ...form, setTotalPriceJPY: e.target.value })}
        className="w-full text-[14px] px-3 py-2 rounded-[var(--radius-sm)] border border-border/70 bg-white/80"
      />
    </div>
    <div>
      <label className="block text-[13px] text-muted-foreground mb-1">
        セット合計重量（g・任意）
      </label>
      <input
        type="number"
        inputMode="numeric"
        value={form.setTotalWeight_g}
        onChange={(e) => setForm({ ...form, setTotalWeight_g: e.target.value })}
        className="w-full text-[14px] px-3 py-2 rounded-[var(--radius-sm)] border border-border/70 bg-white/80"
      />
    </div>
  </>
) : (
  // 通常の袋重量フィールド（既存）
  <div>
    <label className="block text-[13px] text-muted-foreground mb-1">
      袋重量（g・必須）
    </label>
    <input
      type="number"
      inputMode="numeric"
      value={form.bagWeight_g}
      onChange={(e) => setForm({ ...form, bagWeight_g: e.target.value })}
      className="w-full text-[14px] px-3 py-2 rounded-[var(--radius-sm)] border border-border/70 bg-white/80"
    />
  </div>
)}
```

**実行:**
```bash
npm test src/features/bag-new/__tests__/NewBagPage.test.tsx
# → テストが成功することを確認（GREEN）
```

---

### Step 4: 詳細画面の拡張（親Bag表示）

#### 4.1 🔴 RED: テストを書く

**ファイル:** `src/features/bag-detail/__tests__/DetailPage.test.tsx`（既存ファイルに追加）

```typescript
import { mockBag } from '../../../__tests__/utils/mock-data'

describe('DetailPage - Parent Bag Display', () => {
  it('should display set information for parent bag', async () => {
    const parentBag = {
      ...mockBag,
      id: 'parent-1',
      isSet: true,
      childBagIds: ['child-1', 'child-2'],
      remaining_g: 0,
      setInfo: {
        totalPriceJPY: 6000,
        purchaseDate: '2025-09-01',
        totalWeight_g: 600,
      },
    }

    jest.mocked(db.bags.get).mockResolvedValue(parentBag)

    render(<DetailPage bagId="parent-1" />)

    await waitFor(() => {
      expect(screen.getByText('セット商品')).toBeInTheDocument()
      expect(screen.getByText(/¥6,000/)).toBeInTheDocument()
      expect(screen.getByText(/2件/)).toBeInTheDocument() // 子Bag数
    })
  })

  it('should show add child bag button for parent bag', async () => {
    const parentBag = {
      ...mockBag,
      id: 'parent-1',
      isSet: true,
      childBagIds: [],
      remaining_g: 0,
      setInfo: {
        totalPriceJPY: 6000,
        purchaseDate: '2025-09-01',
      },
    }

    jest.mocked(db.bags.get).mockResolvedValue(parentBag)

    render(<DetailPage bagId="parent-1" />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /セット内容を追加/ })).toBeInTheDocument()
    })
  })

  it('should navigate to add child page when button clicked', async () => {
    const user = userEvent.setup()
    const parentBag = {
      ...mockBag,
      id: 'parent-1',
      isSet: true,
      childBagIds: [],
      remaining_g: 0,
      setInfo: {
        totalPriceJPY: 6000,
        purchaseDate: '2025-09-01',
      },
    }

    jest.mocked(db.bags.get).mockResolvedValue(parentBag)

    render(<DetailPage bagId="parent-1" />)

    const addButton = await screen.findByRole('button', { name: /セット内容を追加/ })
    await user.click(addButton)

    expect(mockPush).toHaveBeenCalledWith('/bags/parent-1/set/add')
  })
})
```

**実行:**
```bash
npm test src/features/bag-detail/__tests__/DetailPage.test.tsx
# → テストが失敗することを確認（RED）
```

#### 4.2 🟢 GREEN: 最小限の実装

**ファイル:** `src/features/bag-detail/DetailPage.tsx`

親Bagの場合の表示を追加（既存コードの適切な位置に挿入）:

```tsx
// インポートに追加
import { SplitSquareHorizontal, Plus } from 'lucide-react';

// JSX内、メインセクションの適切な位置に追加
{bag.isSet && (
  <section>
    <Card className="rounded-[var(--radius-md)] bg-white/80 border border-border/70">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <SplitSquareHorizontal className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-[16px] font-semibold">セット商品</h2>
        </div>

        {bag.setInfo && (
          <div className="space-y-2 text-[13px]">
            <div className="flex justify-between">
              <span className="text-muted-foreground">セット価格</span>
              <span className="font-medium">{formatJPY(bag.setInfo.totalPriceJPY)}</span>
            </div>
            {bag.setInfo.totalWeight_g && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">合計重量</span>
                <span>{bag.setInfo.totalWeight_g}g</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">登録済み豆</span>
              <span>{bag.childBagIds?.length ?? 0}件</span>
            </div>
          </div>
        )}

        <Button
          className="w-full tracking-[0.12em]"
          onClick={() => router.push(`/bags/${bag.id}/set/add`)}
        >
          <Plus className="h-4 w-4" />
          セット内容を追加
        </Button>
      </CardContent>
    </Card>
  </section>
)}
```

**実行:**
```bash
npm test src/features/bag-detail/__tests__/DetailPage.test.tsx
# → テストが成功することを確認（GREEN）
```

---

### Step 5: 詳細画面の拡張（子Bag表示）

#### 5.1 🔴 RED: テストを書く

```typescript
describe('DetailPage - Child Bag Display', () => {
  it('should display parent link for child bag', async () => {
    const childBag = {
      ...mockBag,
      id: 'child-1',
      parentBagId: 'parent-1',
    }

    const parentBag = {
      ...mockBag,
      id: 'parent-1',
      name: 'Parent Set Name',
      isSet: true,
    }

    jest.mocked(db.bags.get)
      .mockResolvedValueOnce(childBag)  // 最初の呼び出し
      .mockResolvedValueOnce(parentBag) // 親Bag取得

    render(<DetailPage bagId="child-1" />)

    await waitFor(() => {
      expect(screen.getByText(/Parent Set Name/)).toBeInTheDocument()
      expect(screen.getByText(/の一部/)).toBeInTheDocument()
    })
  })

  it('should navigate to parent when parent link clicked', async () => {
    const user = userEvent.setup()
    const childBag = {
      ...mockBag,
      id: 'child-1',
      parentBagId: 'parent-1',
    }

    const parentBag = {
      ...mockBag,
      id: 'parent-1',
      name: 'Parent Set',
      isSet: true,
    }

    jest.mocked(db.bags.get)
      .mockResolvedValueOnce(childBag)
      .mockResolvedValueOnce(parentBag)

    render(<DetailPage bagId="child-1" />)

    const parentLink = await screen.findByRole('button', { name: /Parent Set/ })
    await user.click(parentLink)

    expect(mockPush).toHaveBeenCalledWith('/bags/parent-1')
  })
})
```

**実行:**
```bash
npm test src/features/bag-detail/__tests__/DetailPage.test.tsx
# → テストが失敗することを確認（RED）
```

#### 5.2 🟢 GREEN: 最小限の実装

**ファイル:** `src/features/bag-detail/DetailPage.tsx`

親Bag情報を取得して表示:

```tsx
// 状態追加
const [parentBag, setParentBag] = useState<Bag | null>(null);

// useEffect内で親Bagを取得
useEffect(() => {
  const loadBag = async () => {
    try {
      const foundBag = await db.bags.get(bagId);
      if (foundBag) {
        setBag(foundBag);
        const displayUrl = await getValidImageUrl(foundBag.imageId);
        setImageUrl(displayUrl);

        // 親Bagがある場合は取得
        if (foundBag.parentBagId) {
          const parent = await db.bags.get(foundBag.parentBagId);
          setParentBag(parent ?? null);
        }
      }
    } catch (error) {
      console.error('Failed to load bag:', error);
    } finally {
      setLoading(false);
    }
  };
  loadBag();
}, [bagId]);

// JSX内、適切な位置に親Bagリンクを追加
{bag.parentBagId && parentBag && (
  <div className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] border border-border/70 bg-white/80 px-3 py-2 text-[12px] text-muted-foreground">
    <SplitSquareHorizontal className="h-3 w-3" />
    <Button
      variant="link"
      className="h-auto p-0 text-[12px] text-muted-foreground hover:text-foreground"
      onClick={() => router.push(`/bags/${parentBag.id}`)}
    >
      {parentBag.name}
    </Button>
    <span>の一部</span>
  </div>
)}
```

**実行:**
```bash
npm test src/features/bag-detail/__tests__/DetailPage.test.tsx
# → テストが成功することを確認（GREEN）
```

---

### Step 6: ホームページのフィルタリング

#### 6.1 🔴 RED: テストを書く

**ファイル:** `src/features/home/__tests__/HomePage.test.tsx`（既存ファイルに追加）

```typescript
describe('HomePage - Parent Bag Filtering', () => {
  it('should hide parent bags by default', async () => {
    const parentBag = {
      ...mockBag,
      id: 'parent-1',
      name: 'Parent Set',
      isSet: true,
      childBagIds: ['child-1'],
      remaining_g: 0,
    }

    const childBag = {
      ...mockBag,
      id: 'child-1',
      name: 'Child Bag',
      parentBagId: 'parent-1',
    }

    jest.mocked(db.bags.toArray).mockResolvedValue([parentBag, childBag])

    render(<HomePage />)

    await waitFor(() => {
      expect(screen.queryByText('Parent Set')).not.toBeInTheDocument()
      expect(screen.getByText('Child Bag')).toBeInTheDocument()
    })
  })

  it('should show parent bags when filter is enabled', async () => {
    const user = userEvent.setup()
    const parentBag = {
      ...mockBag,
      id: 'parent-1',
      name: 'Parent Set',
      isSet: true,
      childBagIds: [],
      remaining_g: 0,
    }

    jest.mocked(db.bags.toArray).mockResolvedValue([parentBag])

    render(<HomePage />)

    const filterButton = await screen.findByRole('button', { name: /セット商品を表示/ })
    await user.click(filterButton)

    expect(screen.getByText('Parent Set')).toBeInTheDocument()
  })
})
```

**実行:**
```bash
npm test src/features/home/__tests__/HomePage.test.tsx
# → テストが失敗することを確認（RED）
```

#### 6.2 🟢 GREEN: 最小限の実装

**ファイル:** `src/features/home/HomePage.tsx`

フィルター状態とロジックを追加:

```tsx
// 状態追加
const [showParentBags, setShowParentBags] = useState(false);

// フィルタリングロジック
const activeBags = useMemo(() => {
  const filtered = bags.filter(b => !isArchived(b));
  if (showParentBags) {
    return filtered;
  }
  // 親Bagを除外
  return filtered.filter(b => !b.isSet);
}, [bags, showParentBags]);

// JSX内、フィルターセクションに追加
<div className="flex items-center gap-2">
  <label className="flex items-center gap-2 text-[13px] text-muted-foreground">
    <input
      type="checkbox"
      checked={showParentBags}
      onChange={(e) => setShowParentBags(e.target.checked)}
      className="rounded border-border/70"
    />
    セット商品を表示
  </label>
</div>
```

**実行:**
```bash
npm test src/features/home/__tests__/HomePage.test.tsx
# → テストが成功することを確認（GREEN）
```

---

### Step 7: 削除処理

#### 7.1 🔴 RED: テストを書く

**ファイル:** `src/features/bag-detail/__tests__/DetailPage.test.tsx`（既存ファイルに追加）

```typescript
describe('DetailPage - Delete with Parent-Child Relationship', () => {
  it('should show confirmation dialog when deleting parent bag', async () => {
    const user = userEvent.setup()
    const parentBag = {
      ...mockBag,
      id: 'parent-1',
      isSet: true,
      childBagIds: ['child-1', 'child-2'],
      remaining_g: 0,
      setInfo: {
        totalPriceJPY: 6000,
        purchaseDate: '2025-09-01',
      },
    }

    jest.mocked(db.bags.get).mockResolvedValue(parentBag)

    render(<DetailPage bagId="parent-1" />)

    const deleteButton = await screen.findByRole('button', { name: /削除/ })
    await user.click(deleteButton)

    expect(screen.getByText(/2個の豆が含まれています/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /セットごと削除/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /セット情報のみ削除/ })).toBeInTheDocument()
  })

  it('should delete all bags when delete all is selected', async () => {
    const user = userEvent.setup()
    const parentBag = {
      ...mockBag,
      id: 'parent-1',
      isSet: true,
      childBagIds: ['child-1'],
      remaining_g: 0,
    }

    jest.mocked(db.bags.get).mockResolvedValue(parentBag)

    render(<DetailPage bagId="parent-1" />)

    const deleteButton = await screen.findByRole('button', { name: /削除/ })
    await user.click(deleteButton)

    const deleteAllButton = screen.getByRole('button', { name: /セットごと削除/ })
    await user.click(deleteAllButton)

    await waitFor(() => {
      expect(db.bags.delete).toHaveBeenCalledWith('parent-1')
      expect(db.bags.delete).toHaveBeenCalledWith('child-1')
    })
  })
})
```

**実行:**
```bash
npm test src/features/bag-detail/__tests__/DetailPage.test.tsx
# → テストが失敗することを確認（RED）
```

#### 7.2 🟢 GREEN: 最小限の実装

**ファイル:** `src/features/bag-detail/DetailPage.tsx`

削除ロジックを更新:

```tsx
// 状態追加
const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

// 削除ハンドラー
async function handleDelete() {
  if (!bag) return;

  if (bag.isSet && (bag.childBagIds?.length ?? 0) > 0) {
    setDeleteDialogOpen(true);
    return;
  }

  // 通常の削除処理
  await performDelete(bag);
}

async function performDelete(bagToDelete: Bag, deleteChildren = false) {
  try {
    if (deleteChildren && bagToDelete.childBagIds) {
      // 子Bagも削除
      for (const childId of bagToDelete.childBagIds) {
        await db.bags.delete(childId);
      }
    }

    await db.bags.delete(bagToDelete.id);
    router.push('/');
  } catch (error) {
    console.error('Failed to delete bag:', error);
  }
}

// 削除確認ダイアログJSX
{deleteDialogOpen && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
    <Card className="w-[90%] max-w-md">
      <CardContent className="p-6 space-y-4">
        <h3 className="text-[18px] font-semibold">セット商品の削除</h3>
        <p className="text-[13px] text-muted-foreground">
          このセットには{bag?.childBagIds?.length}個の豆が含まれています。
        </p>
        <div className="space-y-2">
          <Button
            className="w-full"
            variant="destructive"
            onClick={() => performDelete(bag!, true)}
          >
            セットごと削除
          </Button>
          <Button
            className="w-full"
            variant="outline"
            onClick={() => performDelete(bag!, false)}
          >
            セット情報のみ削除
          </Button>
          <Button
            className="w-full"
            variant="ghost"
            onClick={() => setDeleteDialogOpen(false)}
          >
            キャンセル
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
)}
```

**実行:**
```bash
npm test src/features/bag-detail/__tests__/DetailPage.test.tsx
# → テストが成功することを確認（GREEN）
```

---

## テスト戦略

### テストレベル

1. **単体テスト（Unit Tests）**
   - 型定義の検証
   - バリデーション関数
   - Bag作成関数

2. **統合テスト（Integration Tests）**
   - コンポーネントとデータベースの連携
   - フォーム送信フロー
   - 親子関係の作成・更新

3. **E2Eテスト（End-to-End Tests）**
   - ユーザーフロー全体
   - セット商品登録から子Bag追加まで

### テストカバレッジ目標

- ステートメントカバレッジ: 80%以上
- ブランチカバレッジ: 75%以上
- 関数カバレッジ: 85%以上

### 継続的テスト実行

```bash
# TDD監視モード
./start-tdd.sh

# または
npm test -- --watch
```

---

## 完了チェックリスト

### Phase 1: 基本機能

- [ ] **Step 1: データモデル**
  - [ ] `types.ts` に新フィールド追加
  - [ ] 型定義テスト作成・成功

- [ ] **Step 2: form-validation**
  - [ ] `NewBagForm` インターフェース拡張
  - [ ] `validateForm` 更新
  - [ ] `createBagFromForm` 更新
  - [ ] テスト作成・成功

- [ ] **Step 3: 親Bag登録UI**
  - [ ] セット商品チェックボックス追加
  - [ ] セット専用フィールド追加
  - [ ] バリデーション統合
  - [ ] テスト作成・成功

- [ ] **Step 4: 詳細画面（親Bag）**
  - [ ] セット情報カード表示
  - [ ] セット内容を追加ボタン
  - [ ] 子Bagリスト表示
  - [ ] テスト作成・成功

- [ ] **Step 5: 詳細画面（子Bag）**
  - [ ] 親Bagリンク表示
  - [ ] 親Bag情報取得
  - [ ] テスト作成・成功

- [ ] **Step 6: ホームページ**
  - [ ] 親Bag非表示ロジック
  - [ ] フィルタートグル追加
  - [ ] テスト作成・成功

- [ ] **Step 7: 削除処理**
  - [ ] 親Bag削除確認ダイアログ
  - [ ] セットごと削除機能
  - [ ] セット情報のみ削除機能
  - [ ] テスト作成・成功

### 最終確認

- [ ] 全テストが成功している
- [ ] Lintエラーがない
- [ ] ビルドが成功する
- [ ] 実機テスト完了
  - [ ] セット商品登録
  - [ ] 子Bag追加
  - [ ] 親子関係表示
  - [ ] 削除処理
- [ ] コミット前フックが通過する

---

## リスク管理

### 既知の技術的リスク

1. **既存データとの互換性**
   - リスク: 既存Bagに新フィールドがない
   - 対策: オプショナルフィールドとして定義済み

2. **クラウド同期**
   - リスク: 現状は未実装。将来同期を足す場合、新フィールドの漏れ
   - 対策: 同期対象は Bag レコード全体にする

3. **孤立した子Bag**
   - リスク: 親削除後に子Bagが孤立
   - 対策: 削除時に選択可能（セットごと or セット情報のみ）

### 対応戦略

- 各ステップでテストを必ず実行
- 失敗時は次に進まない（TDD厳守）
- 既存テストが壊れていないか確認
- 実装後は必ず手動テストも実施

---

## 補足資料

- [セット商品仕様書](./SET_PRODUCT_SPECIFICATION.md)
- [TDDガイドライン](../TDD_GUIDELINES.md)
- [プロジェクト概要](../CLAUDE.md)

---

## 更新履歴

- 2025-09-30: 初版作成（Phase 1実装手順）