# カメラ映像遅延アプリ

このウェブアプリは、PCのカメラから取得した映像を指定した遅延時間（0.1秒単位）で表示します。

## 機能

- ウェブカメラからのリアルタイム映像取得
- 0.1秒単位で調整可能な遅延表示（0〜5.0秒）
- シンプルな操作インターフェース

## 使い方

1. 「開始」ボタンをクリックしてカメラへのアクセスを許可します
2. スライダーを動かして希望の遅延時間を設定します（0.1秒〜5.0秒）
3. 遅延した映像がメイン画面に表示されます
4. 「停止」ボタンをクリックすると映像の取得を停止します

## 技術情報

- HTML5 Video API
- Canvas API
- MediaDevices API (getUserMedia)
- requestAnimationFrame による映像処理

## GitHub Pagesでの使用方法

このアプリケーションはGitHub Pagesで実行できます。使用するには以下の手順に従ってください：

1. リポジトリをフォークするか、直接クローンしてください
2. リポジトリの設定ページから「GitHub Pages」セクションを開きます
3. ソースとして「main」ブランチを選択します
4. 設定を保存すると、数分後にページがデプロイされます

## 注意事項

- ブラウザがカメラへのアクセス許可を求めます。許可してください。
- 最新のChrome、Firefox、Edgeなどのモダンブラウザでの使用を推奨します。
- HTTPSで実行する必要があります（GitHub Pagesは対応済み）。 