# React Native 移行ガイド

Coffee LedgerをReact Native (Expo)で再構築するための手順書です。

---

## 目次

1. [事前準備](#1-事前準備)
2. [プロジェクトセットアップ](#2-プロジェクトセットアップ)
3. [ディレクトリ構造](#3-ディレクトリ構造)
4. [画面構成のマッピング](#4-画面構成のマッピング)
5. [データ層の移行](#5-データ層の移行)
6. [UIコンポーネントの移行](#6-uiコンポーネントの移行)
7. [ナビゲーション設定](#7-ナビゲーション設定)
8. [UI英語表記一覧](#8-ui英語表記一覧)
9. [各画面の実装](#9-各画面の実装)
10. [App Store申請準備](#10-app-store申請準備)
11. [チェックリスト](#11-チェックリスト)

---

## 1. 事前準備

### 必要なもの

| 項目 | 説明 |
|------|------|
| Node.js | v18以上 |
| macOS | iOS開発に必須 |
| Xcode | App Store (15.0以上推奨) |
| Apple Developer Program | 年額 ¥12,800 |
| Expo Go アプリ | 実機テスト用（App Store/Google Play） |

### Apple Developer Program 登録手順

1. https://developer.apple.com/programs/ にアクセス
2. 「Enroll」をクリック
3. Apple IDでサインイン
4. 個人 or 組織を選択
5. 年額 ¥12,800 を支払い
6. 承認まで最大48時間待つ

---

## 2. プロジェクトセットアップ

### 2.1 Expoプロジェクト作成

```bash
# 新しいディレクトリで作業（既存プロジェクトとは別）
cd ~/Works
npx create-expo-app@latest coffee-ledger-native --template blank-typescript
cd coffee-ledger-native
```

### 2.2 必要なライブラリをインストール

```bash
# ナビゲーション
npx expo install @react-navigation/native @react-navigation/native-stack
npx expo install react-native-screens react-native-safe-area-context

# データ永続化（SQLite推奨）
npx expo install expo-sqlite

# UI関連
npx expo install expo-image-picker
npx expo install expo-haptics
npx expo install @expo/vector-icons

# 日付処理（既存と同じ）
npm install date-fns

# フォームバリデーション
npm install zod
```

### 2.3 iOS開発環境設定

```bash
# iOS用のネイティブプロジェクト生成
npx expo prebuild --platform ios

# Podインストール
cd ios && pod install && cd ..
```

### 2.4 開発サーバー起動

```bash
# Expo Goで実行（開発時）
npx expo start

# iOSシミュレータで実行
npx expo run:ios
```

---

## 3. ディレクトリ構造

```
coffee-ledger-native/
├── app/                      # Expo Router（ファイルベースルーティング）
│   ├── _layout.tsx           # ルートレイアウト
│   ├── index.tsx             # ホーム画面
│   ├── history.tsx           # 履歴画面
│   └── bags/
│       ├── new.tsx           # 新規登録
│       └── [id]/
│           ├── index.tsx     # 詳細
│           ├── edit.tsx      # 編集
│           ├── record.tsx    # 消費記録
│           └── set/
│               └── add.tsx   # セット追加
├── src/
│   ├── components/
│   │   └── ui/               # 再利用可能UIコンポーネント
│   │       ├── Button.tsx
│   │       ├── Card.tsx
│   │       ├── Input.tsx
│   │       └── Select.tsx
│   ├── features/             # 機能別コンポーネント
│   │   ├── bags/
│   │   └── history/
│   ├── lib/
│   │   ├── db.ts             # SQLiteデータベース
│   │   ├── types.ts          # 型定義（既存を流用）
│   │   └── utils/
│   └── hooks/                # カスタムフック
│       └── useBags.ts
├── assets/                   # 画像・フォント
├── app.json                  # Expo設定
└── tsconfig.json
```

---

## 4. 画面構成のマッピング

| Next.js (現在) | React Native | 説明 |
|----------------|--------------|------|
| `src/app/page.tsx` | `app/index.tsx` | ホーム（一覧） |
| `src/app/bags/new/page.tsx` | `app/bags/new.tsx` | 新規登録 |
| `src/app/bags/[id]/page.tsx` | `app/bags/[id]/index.tsx` | 詳細 |
| `src/app/bags/[id]/edit/page.tsx` | `app/bags/[id]/edit.tsx` | 編集 |
| `src/app/bags/[id]/record/page.tsx` | `app/bags/[id]/record.tsx` | 消費記録 |
| `src/app/bags/[id]/set/add/page.tsx` | `app/bags/[id]/set/add.tsx` | セット追加 |
| `src/app/history/page.tsx` | `app/history.tsx` | 履歴 |

---

## 5. データ層の移行

### 5.1 型定義（そのまま流用）

```typescript
// src/lib/types.ts
// 既存のtypes.tsをそのままコピー
export type Process = 'Washed' | 'Honey' | 'Natural' | 'Anaerobic' | string;

export interface ConsumeLog {
  id: string;
  date: string;
  grams: number;
  grindSize?: string;
  waterTemp?: number;
  waterAmount?: number;
  notes?: string;
  reducesStock: boolean;
}

export interface Bag {
  id: string;
  name: string;
  roaster: string;
  process: Process;
  variety?: string;
  farm?: string;
  country?: string;
  roastDate?: string;
  purchaseDate: string;
  bagWeight_g: number;
  priceJPY?: number;
  remaining_g: number;
  bagDose_g?: number;
  imageUri?: string;  // React Nativeではfile URIを使用
  notes?: string;
  consumeLogs: ConsumeLog[];
  // セット・サブスク関連も同様
  isSet?: boolean;
  parentBagId?: string;
  childBagIds?: string[];
}
```

### 5.2 SQLiteデータベース

```typescript
// src/lib/db.ts
import * as SQLite from 'expo-sqlite';
import type { Bag } from './types';

const db = SQLite.openDatabaseSync('coffee-ledger.db');

// テーブル初期化
export function initDatabase() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS bags (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_bags_updatedAt ON bags(updatedAt);
  `);
}

// 全件取得
export function getAllBags(): Bag[] {
  const rows = db.getAllSync<{ data: string }>(
    'SELECT data FROM bags ORDER BY updatedAt DESC'
  );
  return rows.map(row => JSON.parse(row.data));
}

// 1件取得
export function getBagById(id: string): Bag | null {
  const row = db.getFirstSync<{ data: string }>(
    'SELECT data FROM bags WHERE id = ?',
    [id]
  );
  return row ? JSON.parse(row.data) : null;
}

// 保存（upsert）
export function saveBag(bag: Bag): void {
  const now = new Date().toISOString();
  db.runSync(
    `INSERT OR REPLACE INTO bags (id, data, updatedAt) VALUES (?, ?, ?)`,
    [bag.id, JSON.stringify(bag), now]
  );
}

// 削除
export function deleteBag(id: string): void {
  db.runSync('DELETE FROM bags WHERE id = ?', [id]);
}
```

### 5.3 カスタムフック

```typescript
// src/hooks/useBags.ts
import { useState, useEffect, useCallback } from 'react';
import { getAllBags, saveBag, deleteBag, getBagById } from '@/lib/db';
import type { Bag } from '@/lib/types';

export function useBags() {
  const [bags, setBags] = useState<Bag[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    const data = getAllBags();
    setBags(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const add = useCallback((bag: Bag) => {
    saveBag(bag);
    refresh();
  }, [refresh]);

  const update = useCallback((bag: Bag) => {
    saveBag(bag);
    refresh();
  }, [refresh]);

  const remove = useCallback((id: string) => {
    deleteBag(id);
    refresh();
  }, [refresh]);

  return { bags, loading, refresh, add, update, remove };
}

export function useBag(id: string) {
  const [bag, setBag] = useState<Bag | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const data = getBagById(id);
    setBag(data);
    setLoading(false);
  }, [id]);

  return { bag, loading };
}
```

---

## 6. UIコンポーネントの移行

### 6.1 Web → React Native 対応表

| Web (HTML/CSS) | React Native |
|----------------|--------------|
| `<div>` | `<View>` |
| `<span>`, `<p>` | `<Text>` |
| `<input>` | `<TextInput>` |
| `<button>` | `<Pressable>` or `<TouchableOpacity>` |
| `<img>` | `<Image>` |
| `<ScrollView>` | `<ScrollView>` or `<FlatList>` |
| CSS classes | StyleSheet |
| Tailwind | NativeWind (オプション) |

### 6.2 Buttonコンポーネント例

```typescript
// src/components/ui/Button.tsx
import { Pressable, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import * as Haptics from 'expo-haptics';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'destructive';
  disabled?: boolean;
}

export function Button({ title, onPress, variant = 'primary', disabled }: ButtonProps) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
      onPress={handlePress}
      disabled={disabled}
    >
      <Text style={[styles.text, variant === 'secondary' && styles.textSecondary]}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  primary: {
    backgroundColor: '#2563eb',
  },
  secondary: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  destructive: {
    backgroundColor: '#dc2626',
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  textSecondary: {
    color: '#374151',
  },
});
```

### 6.3 Cardコンポーネント例

```typescript
// src/components/ui/Card.tsx
import { View, StyleSheet, ViewProps } from 'react-native';

interface CardProps extends ViewProps {
  children: React.ReactNode;
}

export function Card({ children, style, ...props }: CardProps) {
  return (
    <View style={[styles.card, style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
});
```

### 6.4 Inputコンポーネント例

```typescript
// src/components/ui/Input.tsx
import { TextInput, View, Text, StyleSheet, TextInputProps } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, style, ...props }: InputProps) {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[styles.input, error && styles.inputError, style]}
        placeholderTextColor="#9ca3af"
        {...props}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#ffffff',
  },
  inputError: {
    borderColor: '#dc2626',
  },
  error: {
    fontSize: 12,
    color: '#dc2626',
    marginTop: 4,
  },
});
```

---

## 7. ナビゲーション設定

### 7.1 Expo Router設定

```bash
# Expo Routerをインストール
npx expo install expo-router expo-linking expo-constants
```

### 7.2 ルートレイアウト

```typescript
// app/_layout.tsx
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { initDatabase } from '@/lib/db';

export default function RootLayout() {
  useEffect(() => {
    initDatabase();
  }, []);

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#ffffff' },
        headerTintColor: '#111827',
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Coffee Ledger' }} />
      <Stack.Screen name="history" options={{ title: 'History' }} />
      <Stack.Screen name="bags/new" options={{ title: 'New Bag' }} />
      <Stack.Screen name="bags/[id]/index" options={{ title: 'Details' }} />
      <Stack.Screen name="bags/[id]/edit" options={{ title: 'Edit' }} />
      <Stack.Screen name="bags/[id]/record" options={{ title: 'Record Brew' }} />
    </Stack>
  );
}
```

---

## 8. UI英語表記一覧

アプリ内の固定テキストは英語で統一します。ユーザーが入力するデータ（コーヒー名など）は任意の言語でOKです。

### 画面タイトル

| 画面 | 英語表記 |
|------|----------|
| ホーム | Coffee Ledger |
| 履歴 | History |
| 新規登録 | New Bag |
| 詳細 | Details |
| 編集 | Edit |
| 消費記録 | Record Brew |
| セット追加 | Add to Set |

### フォームラベル

| 項目 | 英語表記 |
|------|----------|
| コーヒー名 | Coffee Name |
| ロースター | Roaster |
| 内容量 | Bag Weight (g) |
| 残量 | Remaining |
| 精製方法 | Process |
| 品種 | Variety |
| 農園 | Farm |
| 生産国 | Country |
| 焙煎日 | Roast Date |
| 購入日 | Purchase Date |
| 価格 | Price |
| メモ | Notes |
| 挽き目 | Grind Size |
| 湯温 | Water Temp |
| 湯量 | Water Amount |
| 使用量 | Dose |

### ボタン・アクション

| 日本語 | 英語表記 |
|--------|----------|
| 保存 | Save |
| 削除 | Delete |
| キャンセル | Cancel |
| 編集 | Edit |
| 記録する | Record |
| 新規登録 | + New Bag |
| 戻る | Back |

### メッセージ

| 日本語 | 英語表記 |
|--------|----------|
| コーヒー豆を登録しましょう | Add your first coffee bag |
| 削除しますか？ | Delete this bag? |
| この操作は取り消せません | This action cannot be undone |
| 保存しました | Saved |
| 削除しました | Deleted |

---

## 9. 各画面の実装

### 9.1 ホーム画面（一覧）

```typescript
// app/index.tsx
import { View, FlatList, StyleSheet, Pressable, Text } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useBags } from '@/hooks/useBags';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { Bag } from '@/lib/types';

export default function HomeScreen() {
  const { bags, loading } = useBags();
  const router = useRouter();

  const renderItem = ({ item }: { item: Bag }) => (
    <Pressable onPress={() => router.push(`/bags/${item.id}`)}>
      <Card style={styles.card}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.roaster}>{item.roaster}</Text>
        <Text style={styles.remaining}>
          Remaining: {item.remaining_g}g / {item.bagWeight_g}g
        </Text>
      </Card>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={bags}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>Add your first coffee bag</Text>
        }
      />
      <View style={styles.fab}>
        <Button title="+ New Bag" onPress={() => router.push('/bags/new')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    marginBottom: 12,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  roaster: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  remaining: {
    fontSize: 14,
    color: '#374151',
    marginTop: 8,
  },
  empty: {
    textAlign: 'center',
    color: '#9ca3af',
    marginTop: 40,
  },
  fab: {
    position: 'absolute',
    bottom: 32,
    left: 16,
    right: 16,
  },
});
```

### 9.2 新規登録画面

```typescript
// app/bags/new.tsx
import { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useBags } from '@/hooks/useBags';
import type { Bag } from '@/lib/types';

export default function NewBagScreen() {
  const router = useRouter();
  const { add } = useBags();

  const [name, setName] = useState('');
  const [roaster, setRoaster] = useState('');
  const [bagWeight, setBagWeight] = useState('');
  const [process, setProcess] = useState('');

  const handleSubmit = () => {
    const newBag: Bag = {
      id: Date.now().toString(),
      name,
      roaster,
      process: process || 'Washed',
      bagWeight_g: Number(bagWeight) || 0,
      remaining_g: Number(bagWeight) || 0,
      purchaseDate: new Date().toISOString().split('T')[0],
      consumeLogs: [],
    };
    add(newBag);
    router.back();
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <Input
          label="Coffee Name"
          value={name}
          onChangeText={setName}
          placeholder="Ethiopia Yirgacheffe"
        />
        <Input
          label="Roaster"
          value={roaster}
          onChangeText={setRoaster}
          placeholder="Local Coffee Roasters"
        />
        <Input
          label="Bag Weight (g)"
          value={bagWeight}
          onChangeText={setBagWeight}
          placeholder="200"
          keyboardType="numeric"
        />
        <Input
          label="Process"
          value={process}
          onChangeText={setProcess}
          placeholder="Washed / Natural / Honey"
        />
        <Button title="Save" onPress={handleSubmit} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  form: {
    padding: 16,
  },
});
```

---

## 10. App Store申請準備

### 10.1 app.json設定

```json
{
  "expo": {
    "name": "Coffee Ledger",
    "slug": "coffee-ledger",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.yourname.coffeeledger",
      "buildNumber": "1",
      "infoPlist": {
        "NSPhotoLibraryUsageDescription": "Used to save photos of your coffee bags"
      }
    },
    "extra": {
      "eas": {
        "projectId": "your-project-id"
      }
    }
  }
}
```

### 10.2 必要なアセット

```
assets/
├── icon.png           # 1024x1024 アプリアイコン
├── splash.png         # 2732x2732 スプラッシュ画面
├── adaptive-icon.png  # 1024x1024 Android用
└── favicon.png        # 48x48 Web用
```

### 10.3 EASビルド設定

```bash
# EAS CLIインストール
npm install -g eas-cli

# ログイン
eas login

# ビルド設定初期化
eas build:configure

# 開発ビルド（実機テスト用）
eas build --platform ios --profile development

# 本番ビルド（App Store用）
eas build --platform ios --profile production

# App Storeに提出
eas submit --platform ios
```

### 10.4 App Store Connect設定

1. https://appstoreconnect.apple.com にアクセス
2. 「My Apps」→「+」→「New App」
3. 以下を入力:
   - Platform: iOS
   - Name: Coffee Ledger
   - Primary Language: **English (U.S.)**
   - Bundle ID: com.yourname.coffeeledger
   - SKU: coffee-ledger-001

### 10.5 審査に必要な情報

| 項目 | 説明 |
|------|------|
| プライバシーポリシーURL | 必須。GitHub Pagesなどで公開 |
| サポートURL | 問い合わせ先 |
| スクリーンショット | 6.7インチ、6.5インチ、5.5インチ各サイズ |
| アプリ説明文 | 4000文字以内 |
| キーワード | 100文字以内 |
| 年齢制限 | 4+ |

---

## 11. チェックリスト

### フェーズ1: セットアップ
- [ ] Apple Developer Program登録
- [ ] Expoプロジェクト作成
- [ ] 必要なライブラリインストール
- [ ] ディレクトリ構造作成

### フェーズ2: 基盤実装
- [ ] 型定義ファイル移行
- [ ] SQLiteデータベース実装
- [ ] カスタムフック実装
- [ ] UIコンポーネント作成（Button, Card, Input）

### フェーズ3: 画面実装
- [ ] ホーム画面（一覧表示）
- [ ] 新規登録画面
- [ ] 詳細画面
- [ ] 編集画面
- [ ] 消費記録画面
- [ ] 履歴画面
- [ ] セット管理画面

### フェーズ4: 仕上げ
- [ ] UI表記が全て英語になっているか確認
- [ ] アプリアイコン作成
- [ ] スプラッシュ画面作成
- [ ] ダークモード対応
- [ ] Haptic feedback追加
- [ ] エラーハンドリング

### フェーズ5: リリース
- [ ] プライバシーポリシー作成
- [ ] スクリーンショット撮影
- [ ] App Store Connect設定
- [ ] EASビルド実行
- [ ] 審査提出

---

## 参考リンク

- [Expo公式ドキュメント](https://docs.expo.dev/)
- [React Navigation](https://reactnavigation.org/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [App Store審査ガイドライン](https://developer.apple.com/jp/app-store/review/guidelines/)
