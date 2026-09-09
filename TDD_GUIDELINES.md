# TDD Development Guidelines for Claude

## 必須：Test-Driven Development (TDD) プロセス

このプロジェクトでは、**すべての新機能開発においてTDDを厳格に適用**してください。

### 🔴 RED → 🟢 GREEN → 🔄 REFACTOR サイクル

#### 1. 🔴 RED Phase (テストを先に書く)
```typescript
// STEP 1: 失敗するテストを書く
describe('新機能', () => {
  it('should perform expected behavior', () => {
    // Arrange
    const input = 'test data'
    
    // Act
    const result = newFunction(input)
    
    // Assert
    expect(result).toBe('expected output')
  })
})

// この時点で `npm test` を実行し、テストが失敗することを確認
```

#### 2. 🟢 GREEN Phase (最小限の実装)
```typescript
// STEP 2: テストを通すための最小限のコードを書く
export function newFunction(input: string): string {
  return 'expected output' // まずはハードコードでもOK
}

// `npm test` を実行し、テストが成功することを確認
```

#### 3. 🔄 REFACTOR Phase (リファクタリング)
```typescript
// STEP 3: テストが通った状態を維持しながらコードを改善
export function newFunction(input: string): string {
  // 実際のロジックを実装
  return processInput(input)
}

// 各リファクタリング後に `npm test` を実行
```

## 開発フロー

### 新機能追加時の手順

1. **要件分析とテストケース設計**
   ```bash
   # テストファイルを最初に作成
   touch src/features/[feature]/__tests__/[Component].test.tsx
   touch src/lib/utils/__tests__/[utility].test.ts
   ```

2. **テストケースの実装**
   ```typescript
   // 最低限必要なテストケース
   - 正常系の動作
   - 異常系のエラーハンドリング
   - エッジケース
   - 境界値
   ```

3. **実装前のテスト実行**
   ```bash
   npm test [TestFile].test.ts
   # すべてのテストが失敗することを確認（RED）
   ```

4. **最小限の実装**
   ```typescript
   // テストを通すためだけのコードを書く
   // この段階では最適化は考えない
   ```

5. **テスト成功の確認**
   ```bash
   npm test [TestFile].test.ts
   # すべてのテストが成功することを確認（GREEN）
   ```

6. **リファクタリング**
   ```typescript
   // コードの品質向上
   // - 重複の除去
   // - 変数名の改善
   // - 関数の分割
   // - パフォーマンス最適化
   ```

## テスト作成のベストプラクティス

### コンポーネントテスト

```typescript
import { render, screen, waitFor } from '@/__tests__/utils/test-utils'
import userEvent from '@testing-library/user-event'

describe('ComponentName', () => {
  // Setup
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // 表示系テスト
  it('should render initial state correctly', () => {
    render(<Component />)
    expect(screen.getByText('Expected Text')).toBeInTheDocument()
  })

  // インタラクションテスト
  it('should handle user interaction', async () => {
    const user = userEvent.setup()
    render(<Component />)
    
    await user.click(screen.getByRole('button', { name: 'Click Me' }))
    
    await waitFor(() => {
      expect(screen.getByText('Result')).toBeInTheDocument()
    })
  })

  // エラーハンドリング
  it('should handle errors gracefully', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation()
    
    // エラーを発生させる
    
    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })
})
```

### ユーティリティ関数テスト

```typescript
describe('Utility Function', () => {
  // 正常系
  it('should return expected result for valid input', () => {
    expect(utilityFunction('valid')).toBe('expected')
  })

  // 異常系
  it('should handle invalid input', () => {
    expect(utilityFunction(null)).toBeNull()
    expect(utilityFunction(undefined)).toBeUndefined()
    expect(utilityFunction('')).toBe('')
  })

  // エッジケース
  it('should handle edge cases', () => {
    expect(utilityFunction(Number.MAX_VALUE)).toBeDefined()
    expect(utilityFunction([])).toEqual([])
  })
})
```

## モックの使用

### データベースモック
```typescript
jest.mock('@/lib/db', () => ({
  db: {
    bags: {
      get: jest.fn(),
      add: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      toArray: jest.fn(),
    },
  },
}))
```

### Next.js Routerモック
```typescript
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    back: jest.fn(),
    refresh: jest.fn(),
  })),
}))
```

## テストの命名規則

```typescript
// ✅ 良い例
it('should calculate peak status for frozen portions')
it('should return null when input is invalid')
it('should navigate to detail page when card is clicked')

// ❌ 悪い例
it('test peak')
it('works')
it('check navigation')
```

## カバレッジ目標

- **ユーティリティ関数**: 100%
- **ビジネスロジック**: 95%以上
- **UIコンポーネント**: 80%以上
- **全体**: 85%以上

## テスト実行コマンド

```bash
# 単一ファイルのテスト
npm test [FileName].test.ts

# 監視モードでテスト
npm test -- --watch

# カバレッジレポート生成
npm test -- --coverage

# 失敗したテストのみ再実行
npm test -- --onlyFailures
```

## TDD実装チェックリスト

新機能を追加する際は、以下のチェックリストを確認：

- [ ] テストファイルを最初に作成した
- [ ] テストケースを実装前に書いた
- [ ] RED（失敗）状態を確認した
- [ ] 最小限の実装でGREEN（成功）にした
- [ ] リファクタリングを実施した
- [ ] エッジケースをカバーした
- [ ] エラーハンドリングをテストした
- [ ] モックを適切に使用した
- [ ] テストの可読性を確保した
- [ ] `npm test`で全テストが通ることを確認した

## 重要な原則

1. **テストなしでコードを書かない**
2. **失敗するテストを見ずに実装しない**
3. **テストが通ったらリファクタリングする**
4. **1つのテストは1つの振る舞いをテストする**
5. **テストは仕様書として読めるように書く**

## このプロジェクト特有の注意事項

### Coffee Ledger固有のテストパターン

1. **日付関連のテスト**
   ```typescript
   // 現在日付をモック
   const mockDate = new Date('2025-01-15')
   jest.spyOn(global, 'Date').mockImplementation(() => mockDate)
   ```

2. **セット商品のテスト**
   ```typescript
   // 親子関係のテスト
   const parentBag = {
     ...mockBag,
     isSet: true,
     childBagIds: ['child-1', 'child-2'],
     setInfo: { totalPriceJPY: 6000, purchaseDate: '2025-01-01' }
   }
   expect(parentBag.isSet).toBe(true)
   expect(parentBag.childBagIds).toHaveLength(2)
   ```

3. **消費ログのテスト**
   ```typescript
   // 在庫減量の制御をテスト
   const logWithStock = {
     id: 'log-1',
     date: '2025-01-15',
     grams: 15,
     reducesStock: true
   }
   expect(logWithStock.reducesStock).toBe(true)
   ```

---

**このガイドラインに従って、すべての開発でTDDを実践してください。**