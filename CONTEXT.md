# gif4n

gif4n は、端末内の動画を Note に貼り付けやすい GIF へ変換するアプリである。

## 言語

**Video Asset Reference（動画参照）**:
フォトライブラリ内の動画を指す軽量な参照。HomeScreen から TrimScreen へ即時に渡せるが、変換や確実なプレビューに使える準備済みファイルではない。
_避けるべき_: VideoSource（準備済みローカル動画と混同する場合）

**VideoSource（準備済みローカル動画）**:
アプリ管理下のローカルファイルとして利用できる動画。TrimScreen 以降のプレビュー、トリミング、GIF 変換の入力になる。
_避けるべき_: asset（フォトライブラリ上の参照と混同する場合）

**Visible Thumbnail（可視サムネイル）**:
HomeScreen の可視範囲と近傍にある **Video Asset Reference** のためだけに生成するサムネイル。画面滞在中は再利用するが、アプリ再起動後の永続性は保証しない。
_避けるべき_: 全件サムネイル、永続サムネイルキャッシュ

**Review Prompt（レビュー促進）**:
ユーザーにストアレビューを促す表示機会。gif4n では変換成功を起点に判定し、ネイティブのレビュー UI を呼び出す。
_避けるべき_: rating dialog（評価ダイアログ）、custom review modal（自前レビューUI）

**Review Prompt Attempt（レビュー促進試行）**:
アプリが **Review Prompt** の条件を満たしたと判断して、OS にネイティブレビュー UI の表示を依頼した一回の試行。実際に UI が表示されたかや、ユーザーがどう応答したかは含まない。
_避けるべき_: review completed（レビュー完了）、dialog shown（表示済みダイアログ）

**Conversion Success Count（変換成功回数）**:
GIF 変換が成功し、結果画面へ遷移した回数を数える累積値。レビュー促進の表示条件を判定する基準として使う。
_避けるべき_: Result Count（結果回数）、save count（保存回数）
