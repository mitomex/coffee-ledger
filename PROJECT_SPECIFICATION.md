# Coffee Ledger プロジェクト仕様書

## 📋 概要

**Coffee Ledger**は、自家用コーヒー豆の在庫管理と消費記録を行うPWA対応のWebアプリケーションです。

## 🛠 技術スタック

### フロントエンド
- **Framework**: Next.js 16.3.4 (App Router)
- **Language**: TypeScript (strict mode)
- **UI Library**: React 19.1.2
- **Styling**: Tailwind CSS v4
- **UI Components**: Radix UI + shadcn/ui
- **PWA**: Service Worker v6

### データ管理
- **Database**: Dexie.js (IndexedDB wrapper)
- **Storage**: クライアントサイド完結（ローカルファースト）
- **Image Storage**: Base64エンコード（IndexedDB保存）

### 開発環境
- **Build Tool**: Next.js default build pipeline
- **Testing**: Jest + React Testing Library
- **TDD**: 開発環境では Husky pre-commit で `npm test` 実行（`dev-setup.sh`）

## 🏗 アーキテクチャ

```
src/
├── app/                    # Next.js App Router
│   ├── bags/
│   │   ├── [id]/         # 詳細表示
│   │   ├── [id]/edit/    # 編集
│   │   └── new/          # 新規登録
│   └── history/           # 購入履歴
├── features/              # 機能別コンポーネント
├── components/ui/         # 再利用可能UIコンポーネント
└── lib/                   # ユーティリティ
    ├── db.ts             # Dexieデータベース設定
    ├── types.ts          # TypeScript型定義
    └── utils/            # ヘルパー関数
```

## 📊 データモデル

### Bag (メインエンティティ)
```typescript
interface Bag {
  id: string;
  name: string;
  roaster: string;
  roastDate?: string;
  purchaseDate: string;
  bagWeight_g: number;
  remaining_g: number;
  priceJPY?: number;
  process?: string;
  variety?: string;
  notes?: string;
  imageId?: string;
  image?: string;
  bagDose_g?: number;
  // セット商品管理
  isSet?: boolean;
  parentBagId?: string;
  childBagIds?: string[];
  setInfo?: {
    totalPriceJPY: number;
    purchaseDate: string;
    totalWeight_g?: number;
  };
  // サブスクリプション管理
  isSubscriptionTemplate?: boolean;
  subscriptionTemplateId?: string;
  subscriptionInfo?: {
    dayOfMonth: number;
    nextDeliveryDate: string;
    isActive: boolean;
    startDate: string;
  };

  consumeLogs: ConsumeLog[];
}
```

### ConsumeLog (消費記録)
```typescript
interface ConsumeLog {
  id: string;
  date: string;
  method: string;
  grams: number;
  yield_g?: number;
  notes?: string;
  reducesStock: boolean;
}
```

## 🌐 PWA機能

### Service Worker (v6)
- **キャッシュ戦略**:
  - 静的アセット: Cache First
  - HTMLページ: Network First
  - アプリデータ: IndexedDB（端末内のみ）
  - 画像: Cache First with fallback

### オフライン対応
- 事前キャッシュされた静的アセット
- カスタムオフラインページ
- 訪問済みページのキャッシュ

### インストール
- ホーム画面への追加
- スタンドアロンモード対応
- アプリアイコン・スプラッシュ画面

## 🎯 主要機能

### 0. ホームダッシュボード
- アプリ起動時は在庫一覧にフォーカスし、アクティブな豆のみを表示
- 推薦カード（Elegance/Heritage/Discovery）は撤廃し、ソートや履歴リンクなど在庫管理操作を優先配置

### 1. 豆の管理
- **新規登録**: 手動入力による登録
- **詳細表示**: 残量、消費可能杯数
- **編集・削除**: 全項目編集可能
- **画像管理**: Base64エンコードでIndexedDB保存

### 2. 消費記録
- **クイック消費**: ワンタップで1杯分消費
- **詳細記録**:
  - 抽出方法（V60, AeroPress等）
  - 豆量（g）
  - 出液量（g）
  - メモ
  - 入力は専用画面（`/bags/[id]/record`）で行い、記録後は詳細ページへリダイレクト
- **在庫反映**: リアルタイム残量更新

### 3. データ分析
- **消費ペース**: 累計消費量の追跡
- **履歴一覧**: 過去の購入・消費記録

### 4. サブスクリプション機能
- **自動購入記録**: 毎月指定日に自動でBagを追加
  - 購入日から自動計算（例：18日購入 → 毎月18日追加）
  - アプリ起動時に自動チェック
- **サブスク管理**:
  - 登録: 新規Bag作成時に「サブスクリプション」をチェック
  - 解約: 詳細画面から解約可能（過去の購入履歴は保持）
  - 再開: 解約後も再開可能
  - 状態表示: 一覧画面・詳細画面でステータス確認
- **実装**:
  - テンプレートBag（`isSubscriptionTemplate`）として保存
  - 自動生成されたBagは通常のBagとして扱われる
  - TDDで実装（`src/lib/__tests__/subscription.test.ts`）

## 🔧 開発コマンド

```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# 本番サーバー起動
npm start

# リント実行
npm run lint

# テスト実行
npm test

# Vercelデプロイ
vercel --prod
```

## 📱 対応環境

- **モバイル**: iOS Safari, Android Chrome
- **デスクトップ**: Chrome, Edge, Safari, Firefox
- **PWA**: iOS 12+, Android 6+
- **最小画面幅**: 320px
- **推奨画面幅**: 375px以上

## 🚀 デプロイ

- **プラットフォーム**: Vercel
- **環境変数**: 不要（クライアント完結。IndexedDB に保存）
- **ドメイン**: カスタムドメイン対応
- **ビルド設定**: Next.js standard build output

## 📁 ファイル構成

### 重要ファイル
- `/CLAUDE.md`: AI開発ガイドライン
- `/TDD_GUIDELINES.md`: テスト駆動開発ガイド
- `/PWA_GUIDE.md`: PWA使用ガイド
- `/PROJECT_SPECIFICATION.md`: プロジェクト仕様書（本文書）

### 設定ファイル
- `/public/manifest.json`: PWAマニフェスト
- `/public/service-worker.js`: Service Worker
  

## ⚠️ 既知の制限

1. **オフライン制限**:
   - 新規データ作成は不可（読み取りのみ）
   - データは端末内の IndexedDB のみ。クラウド同期は未実装

2. **画像サイズ**:
   - Base64保存のため大容量画像は非推奨
   - 推奨: 500KB以下

3. **ブラウザ制限**:
   - Service WorkerはHTTPS必須
   - iOS Safariは一部PWA機能に制限

## 🔮 今後の拡張予定

- [ ] URL解析による自動入力対応（Definitive., c4e等の商品ページから自動入力）
- [ ] サーバーサイド同期
- [ ] バックグラウンド同期
- [ ] プッシュ通知（リマインダー機能）
- [ ] データエクスポート/インポート（CSV/JSON）
- [ ] 統計・グラフ表示
- [ ] 複数ユーザー対応
- [ ] ダークモード
- [ ] 多言語対応

## 📝 開発規約

### コード規約
- TypeScript strict mode
- ESLint設定準拠
- Prettier自動フォーマット

### Git規約
- TDD推奨（開発環境で pre-commit 実行）
- コミットメッセージ: 簡潔な英語
- ブランチ戦略: main/develop

### テスト規約
- 新機能は必ずテスト作成
- カバレッジ目標: 80%以上
- E2Eテスト: 主要フロー

## 🔒 セキュリティ

- サーバーサイド認証は未実装（アプリは端末内の IndexedDB のみを使う）
- 秘密情報をリポジトリや環境変数に置かない
- XSS/クリックジャッキング対策のセキュリティヘッダを設定
- データは端末内のみ。クラウド同期は未実装

## 📞 サポート

- GitHub Issues: バグ報告・機能要望
- Documentation: `/PWA_GUIDE.md`
- Development: `/CLAUDE.md`

---

最終更新: 2026-09-09
バージョン: 1.0.0
