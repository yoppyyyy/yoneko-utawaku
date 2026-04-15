# Design: MVP — 夜猫歌枠あーかいぶ

## Architecture Overview

静的サイト（HTML/CSS/JS）＋ ビルド時JSON生成のJamstack構成。
サーバーサイドロジックは持たず、GitHub Actionsでデータパイプラインを実行し、GitHub Pagesで配信する。

```
┌─────────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ Google Spreadsheet  │────▶│  GitHub Actions   │────▶│  GitHub Pages   │
│ (データソース)        │     │  fetch-sheets.js  │     │  (静的配信)      │
└─────────────────────┘     │  → JSON生成       │     │  HTML/CSS/JS    │
                            │  → gh-pages deploy │     │  + data/*.json  │
                            └──────────────────┘     └────────┬────────┘
                                                              │
                                                     fetch("./data/*.json")
                                                              │
                                                     ┌────────▼────────┐
                                                     │  ブラウザ (SPA)   │
                                                     │  app.js が描画   │
                                                     └─────────────────┘
```

## UI Structure

単一HTMLファイル内でタブ切り替えによるSPA的な構成。mockup.htmlの設計を踏襲する。

```
┌─────────────────────────────────────────────┐
│  Header: サイトタイトル + サブタイトル          │
├─────────────────────────────────────────────┤
│  Stats Bar: Streams数 / Songs数              │
├─────────────────────────────────────────────┤
│  Search Bar: インクリメンタルサーチ             │
├─────────────────────────────────────────────┤
│  Nav Tabs: [歌枠一覧] [楽曲一覧]              │
├─────────────────────────────────────────────┤
│  Tab Content:                               │
│    歌枠一覧 → カードグリッド → 展開でセトリ表示  │
│    楽曲一覧 → ソート可能テーブル → 展開で出演歴  │
├─────────────────────────────────────────────┤
│  Footer                                     │
└─────────────────────────────────────────────┘
```

## Components

### C-1: Header

- サイトタイトル「夜猫歌枠あーかいぶ」（displayフォント、ゴールドグラデーション、英語表記なし）
- サブタイトル（2行、日本語・bodyフォント・斜体なし）:
  1. 「Pastel Live所属　夜猫アヤさんの歌枠を検索できるサイトです。」
  2. 「このサイトは非公式のファンサイトです。」
- 対応FR: なし（装飾）

### C-2: Stats Bar

- 配信数（Streams）と楽曲数（Songs）の2項目をJSONから算出して表示
- ユニーク曲数（Unique）カウンタは表示しない
- 対応FR: なし（UX向上）

### C-3: Search Bar

- `input[type=text]` でインクリメンタルサーチ
- 曲名・アーティスト名を部分一致で検索
- 検索結果件数を右下に表示
- アクティブタブに応じて検索対象を切り替え
  - 歌枠一覧タブ: カードをフィルタリング（セトリ内の曲にマッチするカードを残す）
  - 楽曲一覧タブ: テーブル行をフィルタリング
- 対応FR: FR-1.1, FR-1.2, FR-1.3

### C-4: Nav Tabs

- 2つのタブ: 「歌枠一覧」「楽曲一覧」
- アクティブタブにCSSクラス `.active` を付与
- タブ切り替えで `.tab-content` の表示/非表示を制御
- 対応FR: FR-7.1

### C-5: Stream Card（歌枠カード）

- サムネイル画像（YouTube動画IDから自動生成URL）
- 曲数バッジ（サムネイル右上）
- 配信日（Cormorant Garamond）
- 配信タイトル
- 曲数表示
- クリックで展開 → セットリスト（C-6）を表示
- 新しい配信順で表示
- 対応FR: FR-2.1, FR-2.2, FR-2.3, FR-5.1, FR-5.2

### C-6: Setlist（セットリスト展開）

- 曲番号 / 曲名 / アーティスト / タイムスタンプ / 再生ボタン
- `max-height` アニメーションで展開/折りたたみ
- 再生ボタンクリック → YouTube `?t=秒数` で新タブ
- 対応FR: FR-4.1, FR-4.2

### C-7: Songs Table（楽曲一覧テーブル）

- カラム: 曲名 / アーティスト / 歌唱回数 / 最新歌唱日
- ソートボタン: 曲名順 / 回数順 / 最新日順
- 行クリックで展開 → 歌唱された配信の一覧（日付・配信名・タイムスタンプ・再生ボタン）
- モバイルではテーブルをカード風レイアウトに変換（`thead` 非表示、`tr` を `flex-wrap`）
- 対応FR: FR-3.1, FR-3.2, FR-3.3, FR-4.1, FR-4.2

### C-8: Footer

- 権利表記（2行。ヘッダーと重複する「本サイトは非公式…」は含めない）:
  1. 当サイトにて掲載している動画は夜猫アヤ様、及びPastel Live様が制作したものであり、著作権は権利者に帰属します。
  2. This is an unofficial fan site. All stream content belongs to its respective creator.
- 対応FR: なし（装飾）

## Design System

### Fonts

| トークン | フォント | 用途 |
|---------|---------|------|
| `--font-display` | Cinzel | サイトタイトル、セクション見出し |
| `--font-body` | Zen Kaku Gothic New | 本文、UI要素 |
| `--font-accent` | Cormorant Garamond | 日付、サブタイトル |

Google Fonts CDNから読み込み。

### Color Palette

requirements.md NFR-2.2 で定義済みの5色をCSSカスタムプロパティで `:root` に設定する。

| トークン | 値 | 役割 |
|---------|-----|------|
| `--c-bg` | `#262D40` (No1) | body背景。唯一の不透明な土台 |
| `--c-accent` | `#97AE73` (No2) | 強調色。サイトタイトルのグラデ、再生ボタン、アクティブ指標 |
| `--c-teal` | `#3F8B92` (No3) | セカンダリアクセント。Stats数値、リンク、副次強調 |
| `--c-muted` | `#8996AC` (No4) | ボーダー、ミュートテキスト |
| `--c-text` | `#8AAEA9` (No5) | 本文テキスト |

#### Surface（面）の階層化

新しい色は追加せず、上記5色のrgba半透明オーバーレイで面を重ねて階層を作る：

| トークン | 値 | 用途 |
|---------|-----|------|
| `--c-surface` | `rgba(138,174,169,0.08)` | カード／タブ帯／検索バー／テーブル行（bgから一段浮く面） |
| `--c-surface-raised` | `rgba(138,174,169,0.14)` | ホバー等、更に浮かせる面 |
| `--c-surface-sunken` | `rgba(0,0,0,0.22)` | セトリ展開部など一段沈む面 |
| アクティブタブ／選択ソート | `rgba(151,174,115,0.22)` | No2セージの薄膜 |

#### 背景装飾

`body::before` / `body::after` による装飾オーバーレイ（ラジアルグラデ／ひし形パターン）は**使用しない**。背景は `--c-bg` のフラットな単色とする。

### Spacing & Radius

| トークン | 値 | 用途 |
|---------|-----|------|
| `--radius-sm` | 8px | テーブル行、小要素 |
| `--radius-md` | 14px | カード |
| `--radius-lg` | 20px | 検索バー、タブバー |

### Header / Above-the-fold Density

ヘッダー上部を詰めて、検索窓とStats Barがファーストビューの中央やや上に収まるようにする：

| 対象 | 値 | 備考 |
|------|-----|------|
| `header` padding | `8px 0 4px` | 旧 `40px 0 20px` から大幅に縮小 |
| `.stats-bar` margin | `4px 0 2px` | — |
| `.gothic-divider` margin | `4px 0` | — |
| `.search-section` margin | `6px auto` | — |

### Stream Card / Thumbnail Size

歌枠カードはコンパクトなグリッドとし、サムネイルを過度に大きく見せない。デスクトップ幅では最大4カード/行に収める（NFR-2.7）：

| 対象 | 値 | 備考 |
|------|-----|------|
| `.streams-grid` 列幅 | `repeat(auto-fill, minmax(230px, 1fr))` | `max-width:1100px` コンテナ・`gap:16px` 前提で4列が成立。サムネイルは `aspect-ratio: 16/9` で自動追随 |
| `.streams-grid` gap | `16px` | 4列時の余白確保のため従来の20pxから縮小 |
| フォールバック画像の高さ | `126px` | — |

### Sticky Controls（検索＋ナビタブの固定）

NFR-1b に従い、`search-section` と `nav-tabs` を同一の `.sticky-controls` ラッパで囲み、ビューポート上端に `position: sticky; top: 0` で固定する。`header` / `stats-bar` / `gothic-divider` は sticky の対象外（通常どおりスクロールアウトする）。

- ラッパ背景は `var(--neutral-950)`（body背景と同色）で不透明化し、スクロール中のカードが透けないようにする
- 下端に1pxボーダーを入れて、スクロール領域との境界を明示する（シャドウは使わない）
- `z-index` は `10` 程度とし、カードより前面に来るようにする
- 横方向は `.container` の内側パディングに揃えつつ、`margin: 0 -20px; padding: 0 20px` で背景を端まで伸ばす

### Text Visibility Fix（STREAMS / SONGS ラベル・フッター）

NFR-2.5 / NFR-2.6 に対応し、以下のミュート色指定を変更する：

| 対象 | 旧 | 新 |
|------|----|----|
| `.stat-label` | `--neutral-600` (#3a3450 ほぼ不可視) | `--neutral-100`（本文色、`opacity:0.75` で抑える） |
| `footer .footer-text` | `--neutral-600` | `--neutral-100` |
| `footer .footer-note` | `--neutral-600` + `opacity:0.6` | `--neutral-100` + `opacity:0.7` |

### Responsive Breakpoint

- `640px` 以下: モバイルレイアウト（1カラム、テーブル→カード変換）

## Data Flow

### JSON Schema

#### streams.json

```json
[
  {
    "stream_id": "S001",
    "date": "2026-04-10",
    "title": "【歌枠】12時間耐久！",
    "youtube_url": "https://www.youtube.com/watch?v=xxxxx",
    "video_id": "xxxxx",
    "description": "春のアニソン祭り！"
  }
]
```

`video_id` はビルドスクリプトで `youtube_url` からパースして付与する。

#### setlists.json

```json
[
  {
    "stream_id": "S001",
    "track_no": 1,
    "song_title": "桜",
    "artist": "コブクロ",
    "timestamp": "00:12:45",
    "seconds": 765
  }
]
```

### Client-side Data Processing

`app.js` の初期化時に両JSONを `fetch()` で取得し、以下の派生データを構築する：

1. **streamsMap**: `stream_id → stream` のMap（セトリから配信情報への逆引き用）
2. **songIndex**: 楽曲名+アーティストをキーに、歌唱回数・最新日・出演配信リストを集約した配列
3. **searchIndex**: 曲名・アーティスト名を正規化（ひらがな化等は将来）した検索用インデックス

## File Structure Plan

```
site/
├── index.html          ← 単一HTMLファイル（Header〜Footer）
├── css/
│   └── style.css       ← 全スタイル（mockup.htmlのCSS抽出）
└── js/
    └── app.js          ← 全ロジック（下記モジュール構成を単一ファイルに）

scripts/
└── fetch-sheets.js     ← Sheets API → JSON生成スクリプト

.github/
└── workflows/
    └── deploy.yml      ← Actions定義（fetch → build → deploy）
```

### app.js 内部構成

単一ファイル内で以下の責務を関数単位で分離する：

| 関数/セクション | 責務 |
|---------------|------|
| `init()` | JSON fetch、データ構築、初期描画 |
| `buildSongIndex(streams, setlists)` | songIndex構築 |
| `renderStreams(streams, setlists)` | 歌枠カードのDOM生成 |
| `renderSongs(songIndex)` | 楽曲テーブルのDOM生成 |
| `handleSearch(query)` | 検索フィルタリング |
| `handleSort(key)` | ソート切り替え |
| `toggleSetlist(card)` | カード展開/折りたたみ |
| `toggleSongDetail(row)` | 楽曲詳細展開/折りたたみ |
| `updateStats(streams, songIndex)` | Stats Bar更新 |
| `extractVideoId(url)` | YouTube URLからvideo_id抽出 |
| `formatTimestamp(seconds)` | 秒数 → HH:MM:SS変換 |

### fetch-sheets.js 内部構成

| 関数/セクション | 責務 |
|---------------|------|
| `fetchSheet(sheetName)` | Sheets APIで指定シートのデータ取得 |
| `transformStreams(rows)` | 行データ → streams.json 形式に変換 |
| `transformSetlists(rows)` | 行データ → setlists.json 形式に変換 |
| `extractVideoId(url)` | YouTube URLからvideo_id抽出・付与 |
| `writeJson(filename, data)` | JSONファイル書き出し |

## Deployment

### GitHub Actions Workflow (deploy.yml)

```
trigger: cron(毎時) or workflow_dispatch(手動)
steps:
  1. checkout main
  2. setup Node.js
  3. npm install
  4. node scripts/fetch-sheets.js → data/ に JSON生成
  5. site/ + data/ をマージした出力ディレクトリを構成
  6. gh-pages ブランチにデプロイ（peaceiris/actions-gh-pages等）
```

### 環境変数 / Secrets

| Secret名 | 用途 |
|----------|------|
| `GOOGLE_SERVICE_ACCOUNT_KEY` | Sheets API認証用サービスアカウントJSON |
| `SPREADSHEET_ID` | 対象スプレッドシートのID |

## Revalidation Triggers

以下の変更が発生した場合、このDesignの見直しが必要：

- データソースがGoogle Sheets以外に変更される場合
- ページ構成が単一HTML + タブ切り替えから複数ページ構成に変わる場合
- サーバーサイドレンダリングが必要になる場合
- 認証が必要になる場合（プライベートコンテンツ等）
