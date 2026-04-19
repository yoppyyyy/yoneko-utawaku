# 夜猫歌枠あーかいぶ

Pastel Live所属・夜猫アヤさんの歌枠配信セットリストを検索できる非公式ファンサイトです。
楽曲名やアーティスト名から配信を探し、ワンクリックで YouTube の該当タイムスタンプへ飛べます。

- **公開サイト**: GitHub Pages にデプロイ
- **データソース**: Google Sheets（メンテナーが編集）
- **自動更新**: GitHub Actions が毎時スプレッドシートから JSON を再生成

## 機能

- 曲名・アーティスト名のインクリメンタルサーチ
- 歌枠一覧（カード表示 + セットリスト展開）
- 楽曲一覧（曲名順 / 歌唱回数順 / 最新歌唱日順でソート）
- YouTube サムネイルの自動表示とタイムスタンプ付き再生リンク

## ディレクトリ構成

```
.
├── site/                    # 静的サイト本体（GitHub Pages で配信）
│   ├── index.html
│   ├── css/style.css
│   └── js/app.js
├── scripts/
│   ├── fetch-sheets/        # 本番パイプライン
│   │   └── fetch-sheets.js  # Google Sheets → data/*.json
│   └── fetch-youtube/       # 運用補助ツール（ローカル実行）
│       ├── fetch-youtube.js # YouTube Data API → CSV
│       └── .env             # API_KEY, CHANNEL_ID（コミットしない）
├── data/                    # 生成物（.gitignore）
│   ├── streams.json
│   └── setlists.json
├── .github/workflows/
│   └── deploy.yml           # 毎時データ取得 + gh-pages デプロイ
└── .kiro/specs/mvp/         # 要件・設計・タスク
    ├── requirements.md
    ├── design.md
    └── tasks.md
```

## セットアップ

### 必要環境
- Node.js 24+

### インストール
```bash
npm install
```

### 環境変数
リポジトリルートに `.env` を作成:

```
SPREADSHEET_ID=<Google Sheets の ID>
GOOGLE_API_KEY=<Sheets API キー>
```

## ローカル開発

### データ取得
```bash
npm run fetch
```
`data/streams.json` と `data/setlists.json` が生成されます。

### サイト表示（目視確認）
`site/` から `../data` を参照するので、リポジトリルートから HTTP サーバを起動します。

```bash
# site/data から data/ へのシンボリックリンクを作成（初回のみ）
ln -sf ../data site/data

# サーバ起動
npx serve -l 8000
```

ブラウザで http://localhost:8000/site/ を開きます。
`file://` で開くと `fetch()` が CORS で失敗するため、必ず HTTP サーバ経由で確認してください。

## 補助スクリプト: スプレッドシート元データ取得

メンテナーが新しい歌枠配信をスプレッドシートに追加する前段として、YouTube チャンネルから配信メタデータを CSV に書き出すローカル実行ツールです。
本番パイプラインには組み込まれていません。

### 準備
依存関係は `npm install` で導入済み（`googleapis`, `dotenv` を共有）。

`scripts/fetch-youtube/.env` を作成:
```
API_KEY=<YouTube Data API v3 キー>
CHANNEL_ID=<対象チャンネルID (UCxxxx...)>
```

### 実行
```bash
npm run fetch-youtube
```

出力: `utawaku_list.csv`（配信日・タイトル・URL・概要、配信日昇順）
タイトルに「歌枠」を含む動画のみ抽出されます。スプレッドシートに手動で貼り付けて使用してください。

## デプロイ

`main` ブランチへの push / 毎時 cron / 手動トリガーで `.github/workflows/deploy.yml` が動作し、以下を実行します:

1. Google Sheets からデータ取得 → `data/*.json` 生成
2. `site/` と `data/` をマージして `gh-pages` ブランチへデプロイ

必要な GitHub Secrets: `SPREADSHEET_ID`, `GOOGLE_API_KEY`

## 著作権

当サイトにて掲載している動画は夜猫アヤ様、及び Pastel Live 様が制作したものであり、著作権は権利者に帰属します。
This is an unofficial fan site. All stream content belongs to its respective creator.
