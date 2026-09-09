# iPhone PWA デプロイメントガイド

## 手順 1: アイコンの生成

1. ブラウザで `public/simple-icon.html` を開く
2. 各キャンバスを右クリックして画像として保存:
   - 1つ目のキャンバス → `public/icon-192.png` として保存
   - 2つ目のキャンバス → `public/icon-512.png` として保存
   - 3つ目のキャンバス → `public/apple-touch-icon.png` として保存

## 手順 2: Vercelにデプロイ

### 方法 A: Vercel CLI使用
```bash
# Vercel CLIをインストール
npm i -g vercel

# プロジェクトルートでデプロイ
vercel

# 初回は設定が必要:
# - Set up and deploy? Yes
# - Which scope? あなたのアカウント
# - Link to existing project? No
# - Project name: coffee-ledger (またはお好みの名前)
# - In which directory is your code located? ./
```

### 方法 B: GitHub連携
1. GitHubにプッシュ
2. [vercel.com](https://vercel.com) でアカウント作成
3. "Import Git Repository" でリポジトリを選択
4. Framework Preset: "Next.js" を選択
5. Deploy をクリック

## 手順 3: HTTPS確認

デプロイ後、以下を確認:
- URLが `https://` で始まること
- PWAの動作に必要
- Service Worker のバージョン（`public/service-worker.js` の `v6`）が反映されていること

## 手順 4: iPhoneでのインストール

### PWAのインストール方法:
1. iPhoneのSafariでデプロイしたURLにアクセス
2. 画面下部の共有ボタン📤をタップ
3. "ホーム画面に追加" を選択
4. アプリ名を確認して "追加" をタップ
5. ホーム画面にアイコンが表示される

### 確認事項:
- ✅ アイコンが正しく表示される
- ✅ スタンドアロンモード（ブラウザのUIが非表示）
- ✅ オフライン動作（Service Worker）
- ✅ 画面の向きが固定される

## トラブルシューティング

### アイコンが表示されない場合:
- キャッシュを削除して再インストール
- PNG アイコンファイルが正しく生成されているか確認

### インストールオプションが表示されない場合:
- HTTPS でアクセスしているか確認
- manifest.json が正しく配信されているか確認
- Service Worker が登録されているか確認

### 参考リンク:
- [PWA インストール条件](https://web.dev/install-criteria/)
- [iOS Safari PWA サポート](https://webkit.org/blog/7929/designing-websites-for-iphone-x/)