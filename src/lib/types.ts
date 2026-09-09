export type Process = 'Washed' | 'Honey' | 'Natural' | 'Anaerobic' | string;

export interface ConsumeLog {
  id: string;
  date: string;        // YYYY-MM-DD
  grams: number;
  grindSize?: string;  // 挽き目
  waterTemp?: number;  // 湯温（℃）
  waterAmount?: number; // 湯量（g）
  notes?: string;
  reducesStock: boolean;
  // 拡張抽出パラメータ
  dripper?: string;     // ドリッパー（例：V60、カリタウェーブ、ORIGAMI等）
  grinder?: string;     // グラインダー（例：Comandante C40、1Zpresso JX等）
  brewTime?: string;    // 抽出時間（例：2:30）
  yieldAmount?: number; // 抽出量（ml）
  bloomTime?: number;   // 蒸らし時間（秒）
  rating?: number;      // 評価（1-5）
}

export interface ImageData {
  id: string;
  data: string; // base64形式の画像データ
  createdAt: Date;
}

export interface Bag {
  id: string;
  name: string;
  roaster: string;
  process: Process;
  variety?: string; // 品種（例：ゲイシャ、ブルボン、カトゥーラ等）
  farm?: string; // 農園名
  country?: string; // 生産国
  roastDate?: string;
  purchaseDate: string;
  bagWeight_g: number;
  priceJPY?: number;
  remaining_g: number;
  bagDose_g?: number;
  imageId?: string; // 端末保存された画像のID
  // 旧仕様でURL文字列として画像を保持していた場合の互換
  image?: string;
  notes?: string; // フレーバーノート・メモ
  consumeLogs: ConsumeLog[];
  version?: number;
  updatedAt?: string;
  deviceId?: string;

  // セット商品管理フィールド
  isSet?: boolean;              // セット商品かどうか
  parentBagId?: string;         // 親セットのID（子Bagの場合のみ）
  childBagIds?: string[];       // 子BagのIDリスト（親Bagの場合のみ）
  setInfo?: {
    totalPriceJPY: number;      // セット全体の購入価格
    purchaseDate: string;       // セットの購入日
    totalWeight_g?: number;     // セット全体の重量（オプション）
  };

  // サブスクリプション管理フィールド
  isSubscriptionTemplate?: boolean;  // これはテンプレート（実際の在庫ではない）
  subscriptionTemplateId?: string;   // このBagはどのテンプレートから生成されたか
  subscriptionInfo?: {
    dayOfMonth: number;              // 毎月の購入日（1-31）
    nextDeliveryDate: string;         // 次回配送予定日 (YYYY-MM-DD)
    isActive: boolean;                // サブスク有効/停止
    startDate: string;                // 初回購入日
  };
}
