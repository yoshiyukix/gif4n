# gif4n — Copilot Instructions

## AI への指示

- **返答は必ず日本語で行うこと**

## プロジェクト概要

MP4 / MOV 動画を Note 記事に貼り付け可能な GIF へ変換するスマホアプリ。変換はオンデバイス完結。

## ドキュメント

仕様・要件の詳細は以下を参照（変更不可・参照専用）:

- `docs/requirements.md` — 要件定義書（外部制約・機能要件）
- `docs/specification.md` — 設計書（アーキテクチャ・画面フロー・変換ロジック）

新機能・バグ修正の着手前に必ず該当箇所を確認すること。**実装を変更したら対応する `docs/` も必ず更新する。**

## 技術スタック

- React Native (Expo SDK 54) + TypeScript
- React Navigation v7（Stack ナビゲーション）
- GIF 変換: iOS = AVFoundation + ImageIO、Android = gifski
- テスト: Jest + jest-expo

## アーキテクチャ

```
Presentation  : src/screens/ , src/components/
Domain        : src/hooks/ , src/usecases/
Infrastructure: src/infrastructure/   ← ネイティブ依存はここのみ
```

ネイティブ呼び出しは必ず `NativeGifService` 経由。Domain 層はネイティブに直接依存しない。

## 開発スタイル — TDD + 仕様駆動開発

TDD サイクルを厳守する:

1. **Red** — 失敗するテストを先に書く
2. **Green** — テストが通る最小限の実装を書く
3. **Refactor** — テストを壊さずコードを整理する

- `docs/` を仕様書として扱い、仕様に記載のないふるまいを実装しない
- ビジネスロジックには対応するユニットテスト（`__tests__/` 配下）を必ず作成する
- 新しいネイティブ依存は必ず `src/infrastructure/` に閉じ込める

## よく使うコマンド

```bash
npm run ios        # iOS シミュレーター
npm run android    # Android エミュレーター
npm test           # テスト実行
npm run typecheck  # 型チェック
```
