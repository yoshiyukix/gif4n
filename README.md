# gif-to-note

MP4 / MOV 動画を、[Note](https://note.com) のテキスト記事に貼り付け可能な GIF へ変換するスマホアプリ。  
変換はすべてオンデバイスで完結し、ネットワーク接続・バックエンドは不要です。

## 特徴

- **Note 対応 GIF を自動生成** — 10 MB 以内に収まる最高品質の設定を自動で選択
- **完全オフライン** — 動画・GIF データを外部サーバーへ送信しない
- **トリミング対応** — スライダーで開始・終了時間を指定し、必要な部分だけ変換
- **そのまま共有** — 生成した GIF をカメラロールへ保存、または Note などのアプリへ直接共有

## スクリーンフロー

```
Home（動画選択）
  → Trim（トリミング）
  → Confirm（変換設定確認）
  → Converting（変換中・進捗表示）
  → Result（GIF プレビュー・保存・共有）
```

## 技術スタック

| 分類 | 内容 |
|------|------|
| フレームワーク | React Native (Expo SDK 54) |
| 言語 | TypeScript |
| ナビゲーション | React Navigation v7 |
| 動画選択 | react-native-image-picker / expo-document-picker |
| GIF 生成（iOS） | AVFoundation + ImageIO（ネイティブモジュール） |
| GIF 生成（Android） | gifski（ネイティブモジュール） |
| テスト | Jest + jest-expo |

## 動作要件

- iOS 15 以上
- Android 10 以上

## セットアップ

```bash
# 依存関係のインストール
npm install

# Metro バンドラー起動
npm start

# iOS シミュレーターで起動
npm run ios

# Android エミュレーターで起動
npm run android
```

## iOS 実機での動作確認

カスタムネイティブモジュール（GIF 変換）を含む全機能を実機で確認するには Development Build が必要です。

### 前提条件

- Xcode がインストール済み
- Apple Developer アカウント（無料可）
- iPhone を Mac に USB 接続

### 手順

```bash
# iOS ネイティブプロジェクトを生成
npx expo prebuild --platform ios

# CocoaPods の依存関係をインストール
cd ios && pod install && cd ..

# 接続中の実機を対象にビルド・起動
npx expo run:ios --device
```

または Xcode で直接実行する場合：

```bash
open ios/*.xcworkspace
```

Xcode でターゲットデバイスを iPhone に変更し、▶ ボタンで実行。

> **注意**: `npm run ios` はシミュレーター起動のみで、実機では `npx expo run:ios --device` を使用してください。

---

## テスト

```bash
# 全テスト実行
npm test

# ウォッチモード
npm run test:watch

# 型チェック
npm run typecheck
```

## プロジェクト構成

```
.
├── App.tsx                  # エントリーコンポーネント
├── index.ts                 # アプリエントリーポイント
├── src/
│   ├── screens/             # 各画面コンポーネント
│   ├── components/          # 再利用 UI コンポーネント
│   ├── hooks/               # 状態管理フック
│   ├── usecases/            # ビジネスロジック（変換・サイズ推定）
│   ├── infrastructure/      # ネイティブモジュール・メディア操作
│   ├── navigation/          # 画面遷移定義
│   └── types/               # 共通型定義
├── ios/                     # iOS ネイティブコード
├── android/                 # Android ネイティブコード
└── docs/                    # 要件定義書・設計書
```

## GIF 品質試行順位

変換時は以下の順に試行し、最初に 10 MB 以内に収まった設定を採用します。

| 優先順位 | 解像度 | fps |
|----------|--------|-----|
| 1 | 620px | 15 |
| 2 | 620px | 10 |
| 3 | 480px | 15 |
| 4 | 620px | 5  |
| 5 | 480px | 10 |
| 6 | 320px | 15 |
| 7 | 480px | 5  |
| 8 | 320px | 10 |
| 9 | 320px | 5  |

すべての設定で 10 MB を超える場合は、動画を短くトリミングするよう案内します。
