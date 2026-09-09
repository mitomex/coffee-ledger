# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🔴 CRITICAL: Test-Driven Development (TDD) is MANDATORY AND ENFORCED

**このプロジェクトはTDD（テスト駆動開発）が自動的に強制されます。**

### ⚠️ TDD強制メカニズム

1. **Git Pre-commit Hook**: テストファイルが存在しない場合、コミット不可
2. **Git Hooks**: `dev-setup.sh` により Husky を初期化し、pre-commit で `npm test` を実行（ローカルでのTDD促進）
3. **開発環境**: `./start-tdd.sh`で自動テスト監視モード

### 必須のTDDプロセス (RED → GREEN → REFACTOR)

**TDD三原則に従います：**

1. **失敗するテストを成功させる以外の目的で実装コードを書いてはならない**
2. **コンパイルが通らず、失敗するテストを作る以外の目的でテストコードを書いてはならない**
3. **現在失敗しているテストを成功させる以外の目的で実装コードを書いてはならない**

#### TDDサイクル（RED → GREEN → REFACTOR）

```bash
# RED: 失敗するテストを書く
# 1. テストファイルを作成
touch src/features/new-feature/__tests__/NewFeature.test.tsx

# 2. 失敗するテスト（最小限）を書く
# - まだ存在しない機能をテストする
# - コンパイルエラーや実行時エラーで失敗させる

# 3. テスト実行で失敗を確認
npm test

# GREEN: テストを通す最小限の実装
# 4. 実装ファイルを作成
touch src/features/new-feature/NewFeature.tsx

# 5. テストが通る最小限のコードを書く
# - "仮実装"（固定値を返すなど）から始める
# - テストが通ることだけを目的とする

# 6. テスト実行で成功を確認
npm test

# REFACTOR: 重複を除去してコードを改善
# 7. テストコードと実装コードの重複を除去
# 8. 各ステップでテストが通ることを確認
# 9. 意味のある実装に改善（三角測量）
```

#### 重要な原則
- **ベイビーステップ**: 一度に追加するコードは最小限に
- **仮実装**: 最初は固定値を返すなど最も簡単な実装から
- **三角測量**: 複数のテストケースで徐々に一般化
- **明白な実装**: 簡単な場合は直接正しい実装を書く

**⚠️ 重要: テストファイルが存在しない実装はコミットできません！**

### 🤖 Agentタスク向け TDD 強制指示

**Agent（Task tool）を使用する際は、以下を必ず守ってください：**

#### Agent起動前の確認事項
- [ ] 実装対象のファイル/機能を明確にする
- [ ] 対応するテストファイルのパスを決定する
- [ ] Agentに「TDD必須」であることを明示する

#### Agentへの指示に必ず含める内容
```
【TDD必須】TDD三原則に従って実装してください。

## TDD三原則
1. 失敗するテストを成功させる以外の目的で実装コードを書いてはならない
2. コンパイルが通らず、失敗するテストを作る以外の目的でテストコードを書いてはならない
3. 現在失敗しているテストを成功させる以外の目的で実装コードを書いてはならない

## 実装手順（RED → GREEN → REFACTOR）
1. RED: 失敗するテスト（最小限）を書く
2. テスト実行で失敗確認
3. GREEN: 仮実装で最小限にテストを通す
4. テスト実行で成功確認
5. REFACTOR: 重複除去と改善
6. 必要に応じて三角測量で一般化

テストファイルパス: [具体的なパスを指定]
```

#### Agent作業完了時のチェック
- [ ] テストファイルが存在する
- [ ] テストが実装をカバーしている
- [ ] 実装がテストを通す
- [ ] コミット可能な状態である

#### 📋 Agent用テンプレート
具体的な指示テンプレートは [docs/AGENT_TDD_TEMPLATE.md](./docs/AGENT_TDD_TEMPLATE.md) を参照してください。

詳細は [TDD_GUIDELINES.md](./TDD_GUIDELINES.md) を参照してください。

## Project Overview

Coffee Ledger is a Next.js 16 application for managing home-brew coffee bags. It tracks coffee inventory, consumption, and freezing portions using Dexie (IndexedDB) for local storage.

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

## Architecture

### Tech Stack
- **Framework**: Next.js 16.3.4 with App Router
- **Language**: TypeScript with strict mode
- **UI Library**: React 19.1.2
- **Database**: Dexie (IndexedDB wrapper) for client-side storage
- **Styling**: Tailwind CSS v4 with custom UI components
- **UI Components**: Radix UI primitives with shadcn/ui patterns
- **Date Handling**: date-fns

### Directory Structure
- `src/app/`: Next.js App Router pages
  - `bags/`: Coffee bag management routes
  - `history/`: Consumption history route
- `src/features/`: Feature-specific components
- `src/components/`:
  - `ui/`: Reusable UI components (Button, Card, Input, etc.)
- `src/lib/`: Core utilities and database
  - `db.ts`: Dexie database configuration
  - `types.ts`: TypeScript interfaces (Bag, ConsumeLog, ImageData)
  - `utils/`: Utility functions for date and coffee calculations

### Key Data Models

**Bag**: Main entity representing a coffee bag with tracking for:
- Basic info: name, roaster, process type, dates
- Inventory: bagWeight_g, remaining_g, bagDose_g
- Consumption: consumeLogs array
- Set products: isSet, parentBagId, childBagIds, setInfo
- Subscription: isSubscriptionTemplate, subscriptionTemplateId, subscriptionInfo (auto-recurring purchases)

**Database Schema**: Single `bags` table indexed by id, purchaseDate, roastDate, roaster, process, isSubscriptionTemplate

### Path Aliases
- `@/*` maps to `./src/*`

## Development Guidelines

- All components use TypeScript with strict typing
- Follow existing UI component patterns in `src/components/ui/`
- Date strings use YYYY-MM-DD format
- Weights are stored in grams (suffix: _g)
- Prices in Japanese Yen (suffix: JPY)
