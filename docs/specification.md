# 設計書: gif4n

**バージョン**: 1.0  
**更新日**: 2026-05-31（HomeScreen の即時遷移・可視サムネイル生成方針、およびレビュー促進フローを反映）
**作成日**: 2026-03-29  
**対応要件定義書**: `docs/requirements.md`

---

## 概要

MP4 / MOV 動画ファイルを、Note テキスト記事に貼り付け可能な GIF へ変換するスマホアプリの設計。  
変換処理はオンデバイスで完結し、バックエンドを持たない。設定した最大サイズ以内の最高品質 GIF を自動生成する。

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

| モジュール             | パス                                       | 役割                                                                                                                                                         |
| ---------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| screens                | `src/screens/`                             | 7 画面コンポーネント                                                                                                                                         |
| components             | `src/components/`                          | 再利用可能な UI 部品                                                                                                                                         |
| ConversionUseCase      | `src/usecases/ConversionUseCase.ts`        | 品質試行ロジック・再試行制御                                                                                                                                 |
| SizeEstimator          | `src/usecases/SizeEstimator.ts`            | 変換前のファイルサイズ事前推定（フォールバック）                                                                                                             |
| PilotEstimationUseCase | `src/usecases/PilotEstimationUseCase.ts`   | パイロット変換で実測した bytes/sec から最適プリセットインデックスを算出                                                                                      |
| VideoSourcePreparationUseCase | `src/usecases/VideoSourcePreparationUseCase.ts` | Video Asset Reference またはファイル選択結果を受け取り、TrimScreen が扱える VideoSource を準備する                                                         |
| NativeGifService       | `src/infrastructure/NativeGifService.ts`   | Platform Channel 経由でネイティブモジュールを呼び出すラッパー（iOS: AVFoundation + gifski / Android: gifski）                                                |
| VideoImportService     | `src/infrastructure/VideoImportService.ts` | フォトライブラリやファイルアプリで選択した動画の URI を正規化し、アプリ管理下のローカルファイルへコピーする                                                  |
| MediaService           | `src/infrastructure/MediaService.ts`       | カメラロール保存・共有シート呼び出し                                                                                                                         |
| GifLibraryStore        | `src/infrastructure/GifLibraryStore.ts`    | 変換済み GIF の一覧データをデバイスのローカルファイル（JSON）で永続管理                                                                                      |
| useConversion          | `src/hooks/useConversion.ts`               | 変換状態管理・画面へのインターフェース（DI: IConversionUseCase を受け取る）                                                                                  |
| useTrim                | `src/hooks/useTrim.ts`                     | トリミング状態管理。`MAX_TRIM_DURATION_SEC`（10 秒）を上限として制限し、範囲が超えた場合は反対側のハンドルを連動して縮める                                   |
| useConversionProcess   | `src/hooks/useConversionProcess.ts`        | NativeGifService + PilotEstimationUseCase + ConversionUseCase を内部生成し、「パイロット推定 → 最適プリセット選択 → GIF 変換」を一貫して提供する wiring hook |
| useMediaActions        | `src/hooks/useMediaActions.ts`             | MediaService を内部生成し、GIF の保存・共有操作を提供する wiring hook                                                                                        |
| ReviewPromptPolicyUseCase | `src/usecases/ReviewPromptPolicyUseCase.ts` | 変換成功を起点に Conversion Success Count の加算、Review Prompt 判定、次フレーム待ち、OS への依頼、Review Prompt Attempt 記録を一貫して行う                 |
| ReviewPromptStore     | `src/infrastructure/ReviewPromptStore.ts`  | Conversion Success Count と Review Prompt Attempt を AsyncStorage に永続化する                                                                                |
| StoreReviewRequester  | `src/infrastructure/StoreReviewRequester.ts` | expo-store-review を介して OS に Review Prompt を依頼する                                                                                                      |
| AppNavigator           | `src/navigation/AppNavigator.tsx`          | ルートナビゲーター（StudioNavigator をラップ）                                                                                                               |
| StudioNavigator        | `src/navigation/StudioNavigator.tsx`       | メインスタック（Home → PrepareVideo → Trim → Converting → Result）+ Settings モーダル導線                                                                    |

### ディレクトリ構成

```
gif4n/
├── src/
│   ├── screens/
│   │   ├── HomeScreen.tsx
│   │   ├── PrepareVideoScreen.tsx
│   │   ├── TrimScreen.tsx
│   │   ├── ConvertingScreen.tsx
│   │   ├── ResultScreen.tsx
│   │   ├── SettingsScreen.tsx
│   │   └── LicensesScreen.tsx
│   ├── components/
│   │   ├── VideoPreview.tsx
│   │   ├── TrimSlider.tsx
│   │   ├── GifPreview.tsx
│   │   ├── CircularProgress.tsx
│   │   └── SaveToast.tsx
│   ├── usecases/
│   │   ├── ConversionUseCase.ts
│   │   ├── SizeEstimator.ts
│   │   ├── PilotEstimationUseCase.ts
│   │   ├── VideoSourcePreparationUseCase.ts
│   │   └── ReviewPromptPolicyUseCase.ts
│   ├── infrastructure/
│   │   ├── NativeGifService.ts
│   │   ├── VideoImportService.ts
│   │   ├── MediaService.ts
│   │   ├── GifLibraryStore.ts
│   │   ├── ReviewPromptStore.ts
│   │   └── StoreReviewRequester.ts
│   ├── hooks/
│   │   ├── useConversion.ts
│   │   ├── useTrim.ts
│   │   ├── useSettings.ts
│   │   ├── useConversionProcess.ts    ← PilotEstimationUseCase + ConversionUseCase wiring hook（推定→変換を統合）
│   │   ├── useMediaActions.ts         ← MediaService wiring hook
│   │   └── ...
│   ├── navigation/
│   │   ├── AppNavigator.tsx
│   │   ├── StudioNavigator.tsx
│   │   └── types.ts
│   ├── assets/
│   │   └── licenses.json      ← pnpm run licenses で自動生成
│   ├── utils/
│   │   └── mediaUtils.ts      ← normalizeMediaLibraryUri など共通ユーティリティ
│   └── types/
│       └── index.ts
├── ios/
├── android/
└── package.json
```

---

## データ設計

### 型定義

#### `AppSettings`

アプリ設定。AsyncStorage キー `@gif_to_note/settings` に JSON で保存される。

| フィールド  | 型             | デフォルト | 説明                               |
| ----------- | -------------- | ---------- | ---------------------------------- |
| `maxSizeMb` | `6 \| 8 \| 10` | `8`        | GIF 変換の最大ファイルサイズ（MB） |

#### `ReviewPromptState`

レビュー促進の内部状態。AsyncStorage キー `@gif_to_note/review_prompt` に JSON で保存される。

| フィールド                 | 型        | デフォルト | 説明                                                                 |
| -------------------------- | --------- | ---------- | -------------------------------------------------------------------- |
| `conversionSuccessCount`   | `number`  | `0`        | GIF 変換が成功し、`ResultScreen` へ遷移した累積回数                  |
| `hasAttemptedReviewPrompt` | `boolean` | `false`    | ネイティブレビュー UI の表示試行を一度でも行ったかどうか             |

#### `VideoSource`

アプリ管理下のローカルファイルとして利用できる、準備済み動画の情報。

| フィールド      | 型       | 説明                       |
| --------------- | -------- | -------------------------- |
| `uri`           | `string` | ローカルファイルの URI     |
| `durationSec`   | `number` | 動画の総秒数               |
| `width`         | `number` | 動画の幅（px）             |
| `height`        | `number` | 動画の高さ（px）           |
| `fileSizeBytes` | `number` | 元ファイルサイズ（バイト） |

#### `VideoAssetReference`

フォトライブラリ上の動画を指す軽量な参照。HomeScreen から PrepareVideoScreen へ即時に渡し、その後 VideoSourcePreparationUseCase が VideoSource へ変換するために使う。

| フィールド | 型       | 説明                        |
| ---------- | -------- | --------------------------- |
| `id`       | `string` | MediaLibrary の asset ID    |
| `filename` | `string` | ファイル名                  |
| `duration` | `number` | 動画の総秒数                |
| `width`    | `number` | 動画の幅（px）              |
| `height`   | `number` | 動画の高さ（px）            |
| `uri`      | `string` | MediaLibrary が返す動画 URI |

#### `TrimRange`

トリミング範囲。`endSec - startSec` は最大 `MAX_TRIM_DURATION_SEC`（10 秒）に制限される。

| フィールド | 型       | 説明           |
| ---------- | -------- | -------------- |
| `startSec` | `number` | 開始時間（秒） |
| `endSec`   | `number` | 終了時間（秒） |

#### `QualityPreset`

変換品質の 1 段階を表す。

| フィールド | 型                  | 説明           |
| ---------- | ------------------- | -------------- |
| `width`    | `320 \| 480 \| 620` | 出力幅（px）   |
| `fps`      | `10 \| 15`          | フレームレート |

#### `ConversionJob`

変換処理の全パラメーターと状態。

| フィールド        | 型                                           | 説明                    |
| ----------------- | -------------------------------------------- | ----------------------- |
| `source`          | `VideoSource`                                | 入力動画                |
| `trim`            | `TrimRange`                                  | トリミング範囲          |
| `preset`          | `QualityPreset`                              | 現在試行中の品質設定    |
| `status`          | `ConversionStatus`                           | 変換状態（後述）        |
| `progressRate`    | `number`                                     | 進捗（0.0〜1.0）        |
| `outputUri`       | `string \| null`                             | 出力 GIF のローカル URI |
| `outputSizeBytes` | `number \| null`                             | 出力ファイルサイズ      |
| `errorMessage`    | `string \| undefined`                        | エラー時のメッセージ    |
| `errorReason`     | `'too_large' \| 'native_error' \| undefined` | エラー時の原因分類      |

#### `ConversionStatus`

```typescript
type ConversionStatus =
  | 'idle' // 未開始
  | 'running' // 変換中
  | 'done' // 完了
  | 'cancelled' // キャンセル済み
  | 'error'; // エラー
```

### データフロー

```
[動画選択]
  → HomeScreen は Video Asset Reference または file request を PrepareVideoScreen へ即時に渡す
  → PrepareVideoScreen は準備中表示を出し、VideoSourcePreparationUseCase.run(request) を呼び出す
       └─ asset-reference request: VideoImportService.importAsset(...) で MediaLibrary の URI を正規化して cacheDirectory へコピー
       └─ file request: VideoImportService.importFileUri(...) で DocumentPicker の URI をキャッシュへコピーし expo-video で durationSec を取得
  → VideoSource 生成後に TrimScreen へ遷移
  → TrimScreen のプレビュー・トリム UI 表示
  → TrimRange 指定（パイロット完了を待たず即時変換ボタンが有効）
  → [GIF動画に変換] で source / trimRange / thumbnailUri のみを ConvertingScreen へ渡す
  → ConvertingScreen 表示後、useConversionProcess.start(source, trimRange) を呼び出し
       └─ Phase 1（piloting）: PilotEstimationUseCase.run(source)
            └─ NativeGifService.convertPilot(source)  ← 25%・50%・75% 地点で各 PILOT_SAMPLE_DURATION_SEC 秒を中間品質 (480px/10fps) で変換し bytes/sec を平均
            └─ bytes/sec を実測 → startIndexOverride を算出（失敗時は undefined でフォールバック）
       └─ Phase 2（running）: ConversionUseCase.run(source, trim, ..., startIndexOverride?)
       └─ startIndexOverride が指定されていれば SizeEstimator をスキップ
       └─ NativeGifService.convert(source, trim, preset)
            └─ Platform Channel → iOS: AVFoundation + gifski / Android: gifski
            └─ 進捗コールバック → useConversion の progressRate 更新
       └─ 実測サイズ ≤ maxSize? → done : 次の preset で再試行
  → ResultScreen 表示
       └─ ReviewPromptPolicyUseCase.handleConversionSuccess(signal) を呼び出す
            └─ ReviewPromptStore.read() で状態を読む
            └─ Conversion Success Count を加算して保存
            └─ Conversion Success Count >= 3 かつ Review Prompt Attempt 未実施なら次フレームまで待機
            └─ StoreReviewRequester.requestReview() で OS に一度だけ依頼
            └─ requestReview() の成否や実際の表示有無にかかわらず Review Prompt Attempt を記録
  → ResultScreen で outputUri を表示・共有
```

---

## インターフェース定義

### `ConversionUseCase`

```typescript
/** ConversionUseCase が必要とするネイティブサービスの最小インターフェース（Domain 层内に定義） */
export interface IConversionNativeService {
  convert(
    source: VideoSource,
    trim: TrimRange,
    preset: QualityPreset,
    onProgress: (rate: number) => void,
    signal: AbortSignal,
  ): Promise<string>;
}

export interface ConversionRunOptions {
  onProgress: (rate: number) => void;
  signal: AbortSignal;
  outputSizeResolver: (uri: string) => Promise<number>;
  onPresetChange?: (preset: QualityPreset) => void;
  maxSizeBytes?: number; // デフォルト: 10MB
  startIndexOverride?: number; // パイロット変換で得たインデックス。指定時は SizeEstimator をスキップ
}

interface IConversionUseCase {
  /**
   * 品質を自動調整しながら GIF を生成する。
   * maxSizeBytes 以内に収まる最高品質の preset を試行順に探索する。
   */
  run(
    source: VideoSource,
    trim: TrimRange,
    options: ConversionRunOptions,
  ): Promise<ConversionResult>;
}
```

### `NativeGifService`

```typescript
interface INativeGifService {
  /**
   * Platform Channel 経由でネイティブ GIF 変換を実行する。
   * iOS: AVFoundation + gifski (Swift)
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

  /**
   * 25%・50%・75% 地点の各 PILOT_SAMPLE_DURATION_SEC 秒を
   * QUALITY_PRESETS[PILOT_PRESET_INDEX]（中間品質: 480px/10fps）で変換し、
   * 1 秒あたりのバイト数の平均を返す。
   * 変換に使用した一時ファイルは内部で削除する。
   * キャンセル時は AbortError をスローする。ネイティブエラー時は例外をそのまま伝播する。
   */
  convertPilot(source: VideoSource, signal: AbortSignal): Promise<number>;
}
```

### `SizeEstimator`

```typescript
interface ISizeEstimator {
  /**
   * 変換前に GIF サイズを近似推定し、最初に試すべき preset インデックスを返す。
   * 推定式: width × height × fps × durationSec × 係数(0.010)
   * パイロット変換が完了している場合は PilotEstimationUseCase が優先されるため、
   * このメソッドはフォールバックとしてのみ使用される。
   * @param maxSizeBytes 許容最大サイズ（バイト）。省略時は 10MB。
   */
  estimateStartIndex(source: VideoSource, trim: TrimRange, maxSizeBytes?: number): number;
}
```

### `PilotEstimationUseCase`

```typescript
interface IPilotEstimationUseCase {
  /**
   * パイロット変換を実行し、1 秒あたりのバイト数を返す。
   * キャンセル・失敗時は null を返す（例外はスローしない）。
   */
  run(source: VideoSource, signal: AbortSignal): Promise<number | null>;

  /**
   * パイロット変換で得た bytes/sec から最適な開始プリセットインデックスを返す。
   * 推定式: bytesPerSec × trimDuration × (width_i² × fps_i) / (pilot_w² × pilot_fps)
   * ここで pilot_w・pilot_fps は QUALITY_PRESETS[PILOT_PRESET_INDEX]（480px/10fps）の値
   * @returns 0〜5 のインデックス（QUALITY_PRESETS の添字）
   */
  estimateStartIndex(bytesPerSec: number, trimDurationSec: number, maxSizeBytes: number): number;
}
```

### `MediaService`

```typescript
interface IMediaService {
  /** GIF をカメラロールに保存し、MediaLibrary の assetId を返す */
  saveToLibrary(uri: string): Promise<string>;
  /** システム共有シートを開く */
  share(uri: string): Promise<void>;
}
```

### `GifLibraryStore`

```typescript
type LibraryGifEntry = {
  assetId: string;
  sizeBytes: number;
  preset: QualityPreset;
  createdAt: number; // Unix ms
};

/** 変換済み GIF エントリを追加する */
function addGifEntry(entry: LibraryGifEntry): Promise<void>;
/** 保存済み GIF エントリ一覧を取得する（新しい順） */
function getGifEntries(): Promise<LibraryGifEntry[]>;
```

### `useConversion` hook

```typescript
interface UseConversionOptions {
  useCase: IConversionUseCase;
  outputSizeResolver: (uri: string) => Promise<number>;
  maxSizeBytes?: number; // useSettings.settings.maxSizeMb * 1024 * 1024 を渡す
}

function useConversion(options: UseConversionOptions): {
  job: ConversionJob | null;
  start: (source: VideoSource, trim: TrimRange, startIndexOverride?: number) => void;
  cancel: () => void;
};
```

### `useSettings` hook

```typescript
interface UseSettingsResult {
  settings: AppSettings;
  isLoaded: boolean; // ストレージからの初期ロードが完了したら true
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
}

function useSettings(): UseSettingsResult;
// AsyncStorage キー: '@gif_to_note/settings'
// 初回マウント時にストレージから読み込み、変更時に保存する
```

### `ReviewPromptPolicyUseCase`

```typescript
class ReviewPromptPolicyUseCase {
  handleConversionSuccess(signal: AbortSignal): Promise<void>;
}
// ReviewPromptStore と StoreReviewRequester を内部アダプターとして使う
// 変換成功から Review Prompt Attempt 記録までを一つのモジュールで扱う
```

### 依存関係

```
screens
  └─ useConversionProcess
       ├─ PilotEstimationUseCase      ← パイロット推定
       │    └─ NativeGifService
       └─ ConversionUseCase
            ├─ SizeEstimator          ← フォールバック
            └─ NativeGifService
  └─ useTrim
  └─ MediaService
```

依存はすべて上位 → 下位の一方向。循環依存なし。

---

## 画面設計

### 画面遷移

アプリは Home 起点の単一スタック構成で、下部タブナビゲーションは使用しない。

```
HomeScreen
  ├─[右下 Settings ボタン] ──→ SettingsScreen（modal）
  │                             └─[OSS ライセンス] ──→ LicensesScreen
  └─[動画選択] ──→ PrepareVideoScreen
                     └─[準備完了] ──→ TrimScreen
                                        └─[変換開始] ──→ ConvertingScreen
                                                           ├─[完了] ──────→ ResultScreen
                                                           └─[キャンセル] → TrimScreen（goBack）
```

### 各画面の責務

| 画面             | 使用 Hook / Service                                          | 主な状態                                                       |
| ---------------- | ------------------------------------------------------------ | -------------------------------------------------------------- |
| HomeScreen       | expo-media-library, expo-document-picker                     | VideoAssetReference / file request                             |
| PrepareVideoScreen | VideoSourcePreparationUseCase                               | 準備中状態 / VideoSource preparation request                   |
| TrimScreen       | useTrim                                                      | VideoSource / TrimRange                                        |
| ConvertingScreen | useConversionProcess, useSettings                            | progressRate / status（piloting/running/done/error/cancelled） |
| ResultScreen     | useMediaActions, ReviewPromptPolicyUseCase                   | outputUri / outputSizeBytes / preset                           |
| SettingsScreen   | useSettings                                                  | maxSizeMb（modal 表示）                                        |
| LicensesScreen   | なし（静的 JSON を import）                                  | 選択中の LicenseEntry（モーダル表示用）                        |

### ライセンス情報の生成（S-005）

```bash
pnpm run licenses
# scripts/generate-licenses.js を実行し src/assets/licenses.json を生成する
# license-checker-rseidelsohn で package.json の全依存を走査し
# { name, version, license, licenseText }[] 形式の JSON をバンドル内に包含する
```

`src/assets/licenses.json` は静的 import して `LicensesScreen` で表示する。

---

## 非機能要件への対応

### パフォーマンス（NF-001, NF-002）

- `useConversionProcess` が ConvertingScreen 遷移直後に `PilotEstimationUseCase.run()` を実行し（status: `'piloting'`）、実測 bytes/sec から最適プリセットを決定してから本変換を開始する（status: `'running'`）。TrimScreen で待機なし
- パイロット失敗時（null 返却）は `SizeEstimator` フォールバックで変換を継続する（回帰なし）
- `NativeGifService` はネイティブスレッドで変換を実行し、JS スレッドをブロックしない
- HomeScreen のカメラロール動画タップでは動画本体をコピーせず、軽量な `VideoAssetReference` を渡して即時に TrimScreen へ遷移する
- HomeScreen の動画サムネイルは FlatList の可視範囲と近傍のみ生成し、画面滞在中のメモリキャッシュで再利用する

### プライバシー（NF-031, NF-032）

- 外部ネットワーク通信を一切行わない（すべてオンデバイス処理）
- カメラロールアクセス権限は `expo-media-library` が初回アクセス時にシステムダイアログで要求する
- iOS purpose string は `NSPhotoLibraryUsageDescription` に「カメラロール内の動画を選択してGIFに変換するため、写真へのアクセスを許可してください。」を使用する

### エラーハンドリング

| エラー種別                      | 対処                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 全 preset で最大サイズ超過      | ConvertingScreen で Alert 表示、TrimScreen へ戻る                                                                                                                                                                                                                                                                                                |
| ネイティブモジュール実行エラー  | エラーメッセージを ConversionResult に含めて ConvertingScreen で Alert 表示                                                                                                                                                                                                                                                                      |
| キャンセル                      | 変換実行中は AbortSignal でネイティブ変換セッションを中断。未開始時は即時に TrimScreen へ戻る（goBack）。JS 層は `convertToGif` 正常完了後にも `signal.aborted` を確認し cancelled を返す。Swift 層は `gifski_set_progress_callback` で `cancelled` フラグを監視し、フラグが立つと 0 を返して `gifski_finish` を GIFSKI_ABORTED で早期完了させる |
| 権限拒否                        | 設定画面へ誘導するアラートを表示                                                                                                                                                                                                                                                                                                                 |
| 非対応フォーマット動画選択      | HomeScreen で Alert 表示（シネマティックモード・スパーシャルビデオ等）                                                                                                                                                                                                                                                                           |
| サムネイル生成失敗（PhotoData） | キャッシュへコピーしてから生成を試行。失敗時は null を返し黒タイルにフォールバック                                                                                                                                                                                                                                                               |

---

## スコープ外

- バックエンド・クラウドストレージ
- WebP アニメーション出力
- ループ回数の手動設定
- テキスト / ウォーターマーク合成

## 未解決事項 / 設計上の懸念

| 懸念                           | 内容                                                                                                                |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| パイロット変換の代表性         | 動画の中間付近を 1 秒サンプルするが、前半と後半で動きの激しさが大きく異なる場合は推定が外れる可能性がある           |
| Android gifski ビルド          | gifski は Rust 製のため、Kotlin NDK バインディングのビルド設定が必要。EAS ビルドで検証する                          |
| パイロット変換の熱・電力コスト | TrimScreen 表示直後にネイティブ変換が走るため、ローエンド端末では発熱が懸念される。実機で計測して許容範囲か確認する |
