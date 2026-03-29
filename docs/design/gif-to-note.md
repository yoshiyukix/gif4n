# 設計書: gif-to-note

**バージョン**: 1.0  
**作成日**: 2026-03-29  
**対応要件定義書**: `docs/requirements.md`

---

## 概要

MP4 / MOV 動画ファイルを、Note テキスト記事に貼り付け可能な GIF へ変換するスマホアプリの設計。  
変換処理はオンデバイスで完結し、バックエンドを持たない。10 MB 以内の最高品質 GIF を自動生成する。

---

## アーキテクチャ

### 全体構成

**レイヤードアーキテクチャ（3 層）** を採用する。ネイティブモジュール依存を Infrastructure 層に閉じ込め、Domain 層のロジックをテスト可能にする。

```
┌─────────────────────────────────────────┐
│  Presentation Layer                     │
│   screens / components（UI）            │
├─────────────────────────────────────────┤
│  Domain Layer                           │
│   hooks / usecases（ビジネスロジック）   │
├─────────────────────────────────────────┤
│  Infrastructure Layer                   │
│   NativeGifService / MediaService / FS  │
└─────────────────────────────────────────┘
```

### モジュール構成

| モジュール | パス | 役割 |
|-----------|------|------|
| screens | `src/screens/` | 5 画面コンポーネント |
| components | `src/components/` | 再利用可能な UI 部品 |
| ConversionUseCase | `src/usecases/ConversionUseCase.ts` | 品質試行ロジック・再試行制御 |
| SizeEstimator | `src/usecases/SizeEstimator.ts` | 変換前のファイルサイズ事前推定 |
| NativeGifService | `src/infrastructure/NativeGifService.ts` | Platform Channel 経由でネイティブモジュールを呼び出すラッパー（iOS: AVFoundation+ImageIO / Android: gifski）|
| MediaService | `src/infrastructure/MediaService.ts` | カメラロール保存・共有シート呼び出し |
| useConversion | `src/hooks/useConversion.ts` | 変換状態管理・画面へのインターフェース |
| useTrim | `src/hooks/useTrim.ts` | トリミング状態管理 |
| AppNavigator | `src/navigation/AppNavigator.tsx` | 画面遷移定義 |

### ディレクトリ構成

```
gif-to-note-app/
├── src/
│   ├── screens/
│   │   ├── HomeScreen.tsx
│   │   ├── TrimScreen.tsx
│   │   ├── ConfirmScreen.tsx
│   │   ├── ConvertingScreen.tsx
│   │   └── ResultScreen.tsx
│   ├── components/
│   │   ├── VideoPreview.tsx
│   │   ├── TrimSlider.tsx
│   │   └── GifPreview.tsx
│   ├── usecases/
│   │   ├── ConversionUseCase.ts
│   │   └── SizeEstimator.ts
│   ├── infrastructure/
│   │   ├── NativeGifService.ts
│   │   └── MediaService.ts
│   ├── hooks/
│   │   ├── useConversion.ts
│   │   └── useTrim.ts
│   ├── navigation/
│   │   └── AppNavigator.tsx
│   └── types/
│       └── index.ts
├── ios/
├── android/
└── package.json
```

---

## データ設計

### 型定義

#### `VideoSource`

選択した動画の情報。

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `uri` | `string` | ローカルファイルの URI |
| `durationSec` | `number` | 動画の総秒数 |
| `width` | `number` | 動画の幅（px）|
| `height` | `number` | 動画の高さ（px）|
| `fileSizeBytes` | `number` | 元ファイルサイズ（バイト）|

#### `TrimRange`

トリミング範囲。

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `startSec` | `number` | 開始時間（秒）|
| `endSec` | `number` | 終了時間（秒）|

#### `QualityPreset`

変換品質の 1 段階を表す。

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `width` | `320 \| 480 \| 620` | 出力幅（px）|
| `fps` | `5 \| 10 \| 15` | フレームレート |

#### `ConversionJob`

変換処理の全パラメーターと状態。

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `source` | `VideoSource` | 入力動画 |
| `trim` | `TrimRange` | トリミング範囲 |
| `preset` | `QualityPreset` | 現在試行中の品質設定 |
| `status` | `ConversionStatus` | 変換状態（後述）|
| `progressRate` | `number` | 進捗（0.0〜1.0）|
| `outputUri` | `string \| null` | 出力 GIF のローカル URI |
| `outputSizeBytes` | `number \| null` | 出力ファイルサイズ |

#### `ConversionStatus`

```typescript
type ConversionStatus =
  | 'idle'        // 未開始
  | 'running'     // 変換中
  | 'checking'    // サイズ確認中（再試行判定）
  | 'done'        // 完了
  | 'cancelled'   // キャンセル済み
  | 'error';      // エラー
```

### データフロー

```
[動画選択] 
  → VideoSource 生成
  → TrimRange 指定
  → ConversionUseCase.run(source, trim)
       └─ SizeEstimator で最適 preset を推定
       └─ NativeGifService.convert(source, trim, preset)
            └─ Platform Channel → iOS: AVFoundation+ImageIO / Android: gifski
            └─ 進捗コールバック → useConversion の progressRate 更新
       └─ 実測サイズ ≤ 10 MB? → done : 次の preset で再試行
  → ResultScreen で outputUri を表示・共有
```

---

## インターフェース定義

### `ConversionUseCase`

```typescript
interface IConversionUseCase {
  /**
   * 品質を自動調整しながら GIF を生成する。
   * 10 MB 以内に収まる最高品質の preset を試行順に探索する。
   */
  run(
    source: VideoSource,
    trim: TrimRange,
    onProgress: (rate: number) => void,
    signal: AbortSignal,
  ): Promise<ConversionResult>;
}

type ConversionResult =
  | { ok: true; outputUri: string; sizeBytes: number; preset: QualityPreset }
  | { ok: false; reason: 'too_large' | 'cancelled' | 'native_error'; message: string };
```

### `NativeGifService`

```typescript
interface INativeGifService {
  /**
   * Platform Channel 経由でネイティブ GIF 変換を実行する。
   * iOS: AVFoundation + ImageIO
   * Android: gifski (Kotlin ネイティブモジュール)
   * @returns 出力 GIF のローカル URI
   */
  convert(
    source: VideoSource,
    trim: TrimRange,
    preset: QualityPreset,
    onProgress: (rate: number) => void,
    signal: AbortSignal,
  ): Promise<string>;
}
```

### `SizeEstimator`

```typescript
interface ISizeEstimator {
  /**
   * 変換前に GIF サイズを近似推定し、最初に試すべき preset インデックスを返す。
   * 推定式: width × height × fps × durationSec × 係数(0.005〜0.015)
   */
  estimateStartIndex(source: VideoSource, trim: TrimRange): number;
}
```

### `MediaService`

```typescript
interface IMediaService {
  /** GIF をカメラロールに保存する */
  saveToLibrary(uri: string): Promise<void>;
  /** システム共有シートを開く */
  share(uri: string): Promise<void>;
}
```

### `useConversion` hook

```typescript
function useConversion(): {
  job: ConversionJob;
  start: (source: VideoSource, trim: TrimRange) => void;
  cancel: () => void;
};
```

### 依存関係

```
screens
  └─ useConversion
       └─ ConversionUseCase
            ├─ SizeEstimator
            └─ NativeGifService
  └─ useTrim
  └─ MediaService
```

依存はすべて上位 → 下位の一方向。循環依存なし。

---

## 画面設計

### 画面遷移

```
HomeScreen
  └─[動画選択] ──→ TrimScreen
                     └─[次へ] ──→ ConfirmScreen
                                    └─[変換開始] ──→ ConvertingScreen
                                                       ├─[完了] ──→ ResultScreen
                                                       └─[キャンセル] ──→ ConfirmScreen
```

### 各画面の責務

| 画面 | 使用 Hook / Service | 主な状態 |
|------|-------------------|---------|
| HomeScreen | react-native-image-picker / document-picker | 選択中の VideoSource |
| TrimScreen | useTrim | TrimRange |
| ConfirmScreen | SizeEstimator（推定時間表示） | — |
| ConvertingScreen | useConversion | progressRate / status |
| ResultScreen | MediaService | outputUri / outputSizeBytes / preset |

---

## 非機能要件への対応

### パフォーマンス（NF-001, NF-002）

- `SizeEstimator` で事前推定し、明らかに 10 MB を超える preset はスキップして試行回数を削減する
- `NativeGifService` はネイティブスレッドで変換を実行し、JS スレッドをブロックしない

### プライバシー（NF-031, NF-032）

- 外部ネットワーク通信を一切行わない（すべてオンデバイス処理）
- カメラロールアクセス権限は `react-native-image-picker` が初回アクセス時にシステムダイアログで要求する

### エラーハンドリング

| エラー種別 | 対処 |
|-----------|------|
| 全 preset で 10 MB 超過 | ConvertingScreen で Alert 表示、トリミング画面へ戻る |
| ネイティブモジュール実行エラー | エラーメッセージを ConversionResult に含めて ConvertingScreen で Alert 表示 |
| キャンセル | AbortSignal でネイティブ変換セッションを中断、ConfirmScreen へ戻る |
| 権限拒否 | 設定画面へ誦導するアラートを表示 |

---

## スコープ外

- バックエンド・クラウドストレージ
- WebP アニメーション出力
- ループ回数の手動設定
- テキスト / ウォーターマーク合成

## 未解決事項 / 設計上の懸念

| 懸念 | 内容 |
|------|------|
| SizeEstimator 係数精度 | 映像の複雑さにより係数が変動する。初期値 0.010 として実機テストで補正する |
| Android gifski ビルド | gifski は Rust 製のため、Kotlin NDK バインディングのビルド設定が必要。EAS ビルドで検証する |
| 再試行 UX | 最悪 9 回変換が走ると待機時間が長くなる。事前推定の精度を上げて 2〜3 回以内に収めることを目標とする |
