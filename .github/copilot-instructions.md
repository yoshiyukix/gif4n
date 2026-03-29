# gif-to-note — Copilot Instructions

## プロジェクト概要

MP4 / MOV 動画を Note テキスト記事に貼り付け可能な GIF へ変換するスマホアプリ。  
変換はオンデバイス完結。バックエンドなし。動画・GIF を外部サーバーへ送信しない。

## 技術スタック

- **React Native** (Expo SDK 54) + **TypeScript**
- **React Navigation v7**（Stack ナビゲーション）
- GIF 変換: iOS = AVFoundation + ImageIO、Android = gifski（いずれもネイティブモジュール）
- テスト: Jest + jest-expo

## アーキテクチャ（3 層）

```
Presentation  : src/screens/ , src/components/
Domain        : src/hooks/ , src/usecases/
Infrastructure: src/infrastructure/   ← ネイティブ依存はここのみ
```

ネイティブモジュール呼び出しは必ず `NativeGifService` を経由する。Domain 層はネイティブに直接依存しない。

## ディレクトリ規約

| パス | 役割 |
|------|------|
| `src/screens/` | 5 画面（Home / Trim / Confirm / Converting / Result） |
| `src/components/` | 再利用 UI（VideoPreview / TrimSlider / GifPreview） |
| `src/usecases/` | ConversionUseCase（品質試行）、SizeEstimator（事前推定） |
| `src/infrastructure/` | NativeGifService、MediaService |
| `src/hooks/` | useConversion、useTrim |
| `src/types/` | 共通型定義 |
| `ios/` | iOS ネイティブモジュール（Swift） |
| `android/` | Android ネイティブモジュール（Kotlin） |
| `docs/` | 要件定義書・設計書（変更不可・参照専用） |

## 主要型

```typescript
type VideoSource = { uri: string; durationSec: number; width: number; height: number; fileSizeBytes: number };
type TrimRange   = { startSec: number; endSec: number };
type QualityPreset = { width: 320 | 480 | 620; fps: 5 | 10 | 15 };
type ConversionStatus = 'idle' | 'running' | 'checking' | 'done' | 'cancelled' | 'error';

type ConversionResult =
  | { ok: true;  outputUri: string; sizeBytes: number; preset: QualityPreset }
  | { ok: false; reason: 'too_large' | 'cancelled' | 'native_error'; message: string };
```

## GIF 変換ルール

- 上限: **10 MB**
- 変換幅: Note の表示幅に合わせ最大 620px
- 品質試行順位（最初に 10 MB 以内に収まった設定を採用）:

  | 順位 | width | fps |
  |------|-------|-----|
  | 1 | 620px | 15 |
  | 2 | 620px | 10 |
  | 3 | 480px | 15 |
  | 4 | 620px | 5  |
  | 5 | 480px | 10 |
  | 6 | 320px | 15 |
  | 7 | 480px | 5  |
  | 8 | 320px | 10 |
  | 9 | 320px | 5  |

- 全段階失敗 → `reason: 'too_large'` エラー、トリミングを促す

## コーディング規約

- 新しいネイティブ依存は必ず `src/infrastructure/` に閉じ込める
- `src/usecases/` と `src/hooks/` はネイティブモジュールを直接 import しない
- ビジネスロジックには対応するユニットテスト（`__tests__/` 配下）を必ず作成する
- `docs/` 内のファイルは参照専用。実装時に要件・設計との整合を確認すること

## よく使うコマンド

```bash
npm start          # Metro 起動
npm run ios        # iOS シミュレーター
npm run android    # Android エミュレーター
npm test           # テスト実行
npm run typecheck  # 型チェック
```
