# 設計書: gif4n

**バージョン**: 1.0  
**更新日**: 2026-04-26（IConversionNativeService 分離・インターフェース定義修正・サムネイル誤記修正）  
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

| モジュール        | パス                                     | 役割                                                                                                         |
| ----------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| screens           | `src/screens/`                           | 6 画面コンポーネント                                                                                         |
| components        | `src/components/`                        | 再利用可能な UI 部品                                                                                         |
| ConversionUseCase      | `src/usecases/ConversionUseCase.ts`      | 品質試行ロジック・再試行制御                                                                                 |
| SizeEstimator          | `src/usecases/SizeEstimator.ts`          | 変換前のファイルサイズ事前推定（フォールバック）                                                             |
| PilotEstimationUseCase | `src/usecases/PilotEstimationUseCase.ts` | パイロット変換で実測した bytes/sec から最適プリセットインデックスを算出                                      |
| NativeGifService       | `src/infrastructure/NativeGifService.ts` | Platform Channel 経由でネイティブモジュールを呼び出すラッパー（iOS: AVFoundation + gifski / Android: gifski） |
| VideoImportService     | `src/infrastructure/VideoImportService.ts` | フォトライブラリやファイルアプリで選択した動画の URI を正規化し、アプリ管理下のローカルファイルへコピーする |
| MediaService      | `src/infrastructure/MediaService.ts`     | カメラロール保存・共有シート呼び出し                                                                         |
| GifLibraryStore   | `src/infrastructure/GifLibraryStore.ts`  | 変換済み GIF の一覧データをデバイスのローカルファイル（JSON）で永続管理                                      |
| useConversion        | `src/hooks/useConversion.ts`          | 変換状態管理・画面へのインターフェース（DI: IConversionUseCase を受け取る）                                 |
| usePilotEstimation   | `src/hooks/usePilotEstimation.ts`     | TrimScreen でパイロット変換を実行し bytes/sec を提供する hook（DI: IPilotEstimationUseCase を受け取る）   |
| useTrim              | `src/hooks/useTrim.ts`                | トリミング状態管理。`MAX_TRIM_DURATION_SEC`（10 秒）を上限として制限し、範囲が超えた場合は反対側のハンドルを連動して縮める                                                                                         |
| useVideoImport       | `src/hooks/useVideoImport.ts`         | VideoImportService を内部生成し、動画インポート操作を Presentation 層へ公開する wiring hook                 |
| useTrimPilot         | `src/hooks/useTrimPilot.ts`           | NativeGifService + PilotEstimationUseCase を内部生成し、パイロット変換結果と estimateStartIndex を提供する wiring hook |
| useConversionProcess | `src/hooks/useConversionProcess.ts`   | NativeGifService + SizeEstimator + ConversionUseCase を内部生成し、GIF 変換操作を提供する wiring hook     |
| useMediaActions      | `src/hooks/useMediaActions.ts`        | MediaService を内部生成し、GIF の保存・共有操作を提供する wiring hook                                     |
| useGifLibrary        | `src/hooks/useGifLibrary.ts`          | GifLibraryStore + MediaLibrary を組み合わせて GIF ライブラリ一覧を取得する wiring hook                     |
| AppNavigator      | `src/navigation/AppNavigator.tsx`        | ルートナビゲーター（TabNavigator をラップ）                                                                  |
| TabNavigator      | `src/navigation/TabNavigator.tsx`        | Studio / Library の底部タブ                                                                                  |
| StudioNavigator   | `src/navigation/StudioNavigator.tsx`     | Studio タブのスタック（Home → Trim → Converting → Result）                                                   |
| LibraryNavigator  | `src/navigation/LibraryNavigator.tsx`    | Library タブのスタック（Library → LibraryDetail）                                                            |

### ディレクトリ構成

```
gif4n/
├── src/
│   ├── screens/
│   │   ├── HomeScreen.tsx
│   │   ├── TrimScreen.tsx
│   │   ├── ConvertingScreen.tsx
│   │   ├── ResultScreen.tsx
│   │   ├── LibraryScreen.tsx
│   │   ├── LibraryDetailScreen.tsx
│   │   ├── SettingsScreen.tsx
│   │   └── LicensesScreen.tsx
│   ├── components/
│   │   ├── VideoPreview.tsx
│   │   ├── TrimSlider.tsx
│   │   ├── GifPreview.tsx
│   │   ├── AppTabBar.tsx
│   │   ├── CircularProgress.tsx
│   │   └── SaveToast.tsx
│   ├── usecases/
│   │   ├── ConversionUseCase.ts
│   │   ├── SizeEstimator.ts
│   │   └── PilotEstimationUseCase.ts
│   ├── infrastructure/
│   │   ├── NativeGifService.ts
│   │   ├── VideoImportService.ts
│   │   ├── MediaService.ts
│   │   └── GifLibraryStore.ts
│   ├── hooks/
│   │   ├── useConversion.ts
│   │   ├── usePilotEstimation.ts
│   │   ├── useTrim.ts
│   │   ├── useSettings.ts
│   │   ├── useVideoImport.ts          ← VideoImportService wiring hook
│   │   ├── useTrimPilot.ts            ← NativeGifService + PilotEstimationUseCase wiring hook
│   │   ├── useConversionProcess.ts    ← ConversionUseCase wiring hook
│   │   ├── useMediaActions.ts         ← MediaService wiring hook
│   │   └── useGifLibrary.ts           ← GifLibraryStore wiring hook
│   ├── navigation/
│   │   ├── AppNavigator.tsx
│   │   ├── TabNavigator.tsx
│   │   ├── StudioNavigator.tsx
│   │   ├── LibraryNavigator.tsx
│   │   ├── SettingsNavigator.tsx
│   │   └── types.ts
│   ├── assets/
│   │   └── licenses.json      ← npm run licenses で自動生成
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
| `maxSizeMb` | `6 \| 8 \| 10` | `8`       | GIF 変換の最大ファイルサイズ（MB） |

#### `VideoSource`

選択した動画の情報。

| フィールド      | 型       | 説明                       |
| --------------- | -------- | -------------------------- |
| `uri`           | `string` | ローカルファイルの URI     |
| `durationSec`   | `number` | 動画の総秒数               |
| `width`         | `number` | 動画の幅（px）             |
| `height`        | `number` | 動画の高さ（px）           |
| `fileSizeBytes` | `number` | 元ファイルサイズ（バイト） |

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

| フィールド        | 型                 | 説明                    |
| ----------------- | ------------------ | ----------------------- |
| `source`          | `VideoSource`      | 入力動画                |
| `trim`            | `TrimRange`        | トリミング範囲          |
| `preset`          | `QualityPreset`    | 現在試行中の品質設定    |
| `status`          | `ConversionStatus` | 変換状態（後述）        |
| `progressRate`    | `number`           | 進捗（0.0〜1.0）        |
| `outputUri`       | `string \| null`   | 出力 GIF のローカル URI |
| `outputSizeBytes` | `number \| null`   | 出力ファイルサイズ      |
| `errorMessage`    | `string \| undefined` | エラー時のメッセージ |
| `errorReason`     | `'too_large' \| 'native_error' \| undefined` | エラー時の原因分類 |

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
  → VideoImportService.importAsset(...) で MediaLibrary の URI を正規化してアプリの cacheDirectory へコピー
  → （F-002）VideoImportService.importFileUri(...) で DocumentPicker の URI をキャッシュへコピーし expo-video で durationSec を取得
  → VideoSource 生成
  → TrimScreen 表示（バックグラウンドでパイロット変換を開始）
       └─ usePilotEstimation → PilotEstimationUseCase.run(source)
            └─ NativeGifService.convertPilot(source)  ← 25%・50%・75% 地点で各 PILOT_SAMPLE_DURATION_SEC 秒を中間品質 (480px/10fps) で変換し bytes/sec を平均（最高品質への外挿倍率 ~2.5倍）
            └─ bytes/sec を実測
  → TrimRange 指定
  → [Next] で estimatedStartIndex を計算して ConvertingScreen へ渡す
       └─ パイロット完了済み: max(0, PilotEstimationUseCase.estimateStartIndex(bytes/sec, duration, maxSize))
       └─ パイロット未完了: undefined（SizeEstimator フォールバック）
  → ConversionUseCase.run(source, trim, ..., startIndexOverride?)
       └─ startIndexOverride が指定されていれば SizeEstimator をスキップ
       └─ NativeGifService.convert(source, trim, preset)
            └─ Platform Channel → iOS: AVFoundation + gifski / Android: gifski
            └─ 進捗コールバック → useConversion の progressRate 更新
       └─ 実測サイズ ≤ maxSize? → done : 次の preset で再試行
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
  maxSizeBytes?: number;         // デフォルト: 10MB
  startIndexOverride?: number;   // パイロット変換で得たインデックス。指定時は SizeEstimator をスキップ
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

### `usePilotEstimation` hook

```typescript
interface UsePilotEstimationResult {
  bytesPerSec: number | null; // 完了前または失敗時は null
  isPilotDone: boolean;       // 完了（成功・失敗問わず）したら true
}

// マウント時にパイロット変換を開始し、アンマウット時に自動キャンセルする
function usePilotEstimation(
  source: VideoSource,
  useCase: IPilotEstimationUseCase,
): UsePilotEstimationResult;
```

### `useSettings` hook

```typescript
interface UseSettingsResult {
  settings: AppSettings;
  isLoaded: boolean;         // ストレージからの初期ロードが完了したら true
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
}

function useSettings(): UseSettingsResult;
// AsyncStorage キー: '@gif_to_note/settings'
// 初回マウント時にストレージから読み込み、変更時に保存する
```

### 依存関係

```
screens
  └─ useConversion
       └─ ConversionUseCase
            ├─ SizeEstimator          ← フォールバック
            └─ NativeGifService
  └─ usePilotEstimation
       └─ PilotEstimationUseCase
            └─ NativeGifService
  └─ useTrim
  └─ MediaService
```

依存はすべて上位 → 下位の一方向。循環依存なし。

---

## 画面設計

### 画面遷移

アプリは **Studio** / **Library** / **Settings** の 3 タブ構成。

```
[タブ: Studio]
HomeScreen
  └─[動画選択] ──→ TrimScreen
                     └─[変換開始] ──→ ConvertingScreen
                                        ├─[完了] ──────→ ResultScreen
                                        └─[キャンセル] → TrimScreen（goBack）

[タブ: Library]
LibraryScreen
  └─[GIF 選択] ──→ LibraryDetailScreen

[タブ: Settings]
SettingsScreen
  └─[OSS ライセンス] ──→ LicensesScreen
```

### 各画面の責務

| 画面                | 使用 Hook / Service                         | 主な状態                                            |
| ------------------- | ------------------------------------------- | --------------------------------------------------- |
| HomeScreen          | expo-media-library, expo-document-picker, VideoImportService | 選択中の VideoSource                                |
| TrimScreen          | useTrim, usePilotEstimation, useSettings    | TrimRange, bytesPerSec（パイロット変換結果）         |
| ConvertingScreen    | useConversion, useSettings                  | progressRate / status / maxSizeBytes                |
| ResultScreen        | MediaService, GifLibraryStore               | outputUri / outputSizeBytes / preset                |
| LibraryScreen       | GifLibraryStore                             | LibraryGifEntry[]                                   |
| LibraryDetailScreen | MediaService                                | assetId / localUri / sizeBytes / preset / createdAt |
| SettingsScreen      | useSettings                                 | maxSizeMb                                           |
| LicensesScreen      | なし（静的 JSON を import）                 | 選択中の LicenseEntry（モーダル表示用）             |

### ライセンス情報の生成（S-005）

```bash
npm run licenses
# scripts/generate-licenses.js を実行し src/assets/licenses.json を生成する
# license-checker-rseidelsohn で package.json の全依存を走査し
# { name, version, license, licenseText }[] 形式の JSON をバンドル内に包含する
```

`src/assets/licenses.json` は静的 import して `LicensesScreen` で表示する。

---

## 非機能要件への対応

### パフォーマンス（NF-001, NF-002）

- `PilotEstimationUseCase` + `usePilotEstimation` により、TrimScreen 表示中にバックグラウンドで動画中間付近の 1 秒をパイロット変換し、実測 bytes/sec からプリセットを決定する。ユーザーの追加待ち時間はゼロ
- パイロット変換が未完了で Next が押された場合は `SizeEstimator` にフォールバックする（回帰なし）
- `NativeGifService` はネイティブスレッドで変換を実行し、JS スレッドをブロックしない

### プライバシー（NF-031, NF-032）

- 外部ネットワーク通信を一切行わない（すべてオンデバイス処理）
- カメラロールアクセス権限は `expo-media-library` が初回アクセス時にシステムダイアログで要求する

### エラーハンドリング

| エラー種別                     | 対処                                                                        |
| ------------------------------ | --------------------------------------------------------------------------- |
| 全 preset で最大サイズ超過     | ConvertingScreen で Alert 表示、TrimScreen へ戻る                           |
| ネイティブモジュール実行エラー | エラーメッセージを ConversionResult に含めて ConvertingScreen で Alert 表示 |
| キャンセル                     | AbortSignal でネイティブ変換セッションを中断、TrimScreen へ戻る（goBack）   |
| 権限拒否                       | 設定画面へ誘導するアラートを表示                                            |
| 非対応フォーマット動画選択     | HomeScreen で Alert 表示（シネマティックモード・スパーシャルビデオ等）      |
| サムネイル生成失敗（PhotoData）| キャッシュへコピーしてから生成を試行。失敗時は null を返し黒タイルにフォールバック |

---

## スコープ外

- バックエンド・クラウドストレージ
- WebP アニメーション出力
- ループ回数の手動設定
- テキスト / ウォーターマーク合成

## 未解決事項 / 設計上の懸念

| 懸念                          | 内容                                                                                                                                      |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| パイロット変換の代表性        | 動画の中間付近を 1 秒サンプルするが、前半と後半で動きの激しさが大きく異なる場合は推定が外れる可能性がある                                 |
| Android gifski ビルド         | gifski は Rust 製のため、Kotlin NDK バインディングのビルド設定が必要。EAS ビルドで検証する                                                |
| パイロット変換の熱・電力コスト | TrimScreen 表示直後にネイティブ変換が走るため、ローエンド端末では発熱が懸念される。実機で計測して許容範囲か確認する                       |
