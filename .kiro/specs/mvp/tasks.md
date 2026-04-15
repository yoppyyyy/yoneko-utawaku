# Tasks: MVP — VTuber歌枠ファンサイト

## Wave 1 — 基盤（並列実行可能）

### Task 1: プロジェクト初期化
- **ID**: T-1
- **Priority**: P0
- **Depends on**: なし
- **Files**: `package.json`, `.gitignore`, `.github/workflows/deploy.yml`
- **Acceptance Criteria**:
  - [x] `git init` でリポジトリ初期化
  - [x] `package.json` 作成（name, scripts, dependencies: googleapis）
  - [x] `.gitignore` に `node_modules/`, `data/` を記載
  - [x] ディレクトリ構造を作成（`site/`, `site/css/`, `site/js/`, `scripts/`）

### Task 2: HTMLシェル作成
- **ID**: T-2
- **Priority**: P0
- **Depends on**: なし
- **Files**: `site/index.html`
- **Acceptance Criteria**:
  - [x] mockup.htmlの構造を元に `site/index.html` を作成
  - [x] Header（C-1）、Stats Bar（C-2）、Search Bar（C-3）、Nav Tabs（C-4）、Tab Content領域、Footer（C-8）の骨格を配置
  - [x] Tab Content内は空コンテナ（JSで動的生成するため）
  - [x] Google Fonts CDN読み込み（Cinzel, Zen Kaku Gothic New, Cormorant Garamond）
  - [x] `css/style.css` と `js/app.js` をリンク

### Task 3: CSS作成
- **ID**: T-3
- **Priority**: P0
- **Depends on**: なし
- **Files**: `site/css/style.css`
- **Acceptance Criteria**:
  - [x] mockup.htmlから全CSSを抽出して `site/css/style.css` に配置
  - [x] CSSカスタムプロパティ（カラーパレット、フォント、radius）を `:root` に定義
  - [x] レスポンシブ対応（640px breakpoint）を含む
  - [x] アニメーション（fadeInUp）を含む

## Wave 2 — データ層

### Task 4: データ取得スクリプト作成
- **ID**: T-4
- **Priority**: P0
- **Depends on**: T-1
- **Files**: `scripts/fetch-sheets.js`
- **Acceptance Criteria**:
  - [x] Google Sheets APIでスプレッドシートからデータ取得
  - [x] `streams` シートを `data/streams.json` に変換・書き出し
  - [x] `setlists` シートを `data/setlists.json` に変換・書き出し
  - [x] `youtube_url` から `video_id` を抽出して streams.json に付与
  - [x] 環境変数 `GOOGLE_API_KEY`, `SPREADSHEET_ID` で認証情報を受け取る（`.env` + dotenv対応）
  - [x] `data/` ディレクトリがなければ自動作成

### Task 5: サンプルJSONデータ作成
- **ID**: T-5
- **Priority**: P0
- **Depends on**: なし
- **Files**: `data/streams.json`, `data/setlists.json`
- **Acceptance Criteria**:
  - [x] スプレッドシートから実データを取得（2配信・5曲）
  - [x] streams.json: design.mdのJSON Schemaに準拠
  - [x] setlists.json: design.mdのJSON Schemaに準拠
  - [ ] 同じ曲が複数配信に登場するデータを含む（FR-1.3検証用）— データ追加時に対応

## Wave 3 — フロントエンドロジック

### Task 6: データ読み込みと初期化
- **ID**: T-6
- **Priority**: P0
- **Depends on**: T-2, T-5
- **Files**: `site/js/app.js`
- **Scope**: `init()`, `buildSongIndex()`, `updateStats()`, `extractVideoId()`
- **Acceptance Criteria**:
  - [x] `fetch()` で `./data/streams.json` と `./data/setlists.json` を取得
  - [x] `buildSongIndex()` で楽曲ごとの歌唱回数・最新日・出演配信リストを集約
  - [x] `updateStats()` で Stats Bar（配信数・楽曲数・ユニーク曲数）を更新
  - [x] `extractVideoId()` でYouTube URLからvideo_idを抽出

### Task 7: 歌枠一覧の描画
- **ID**: T-7
- **Priority**: P0
- **Depends on**: T-6
- **Files**: `site/js/app.js`
- **Scope**: `renderStreams()`, `toggleSetlist()`
- **Acceptance Criteria**:
  - [x] 配信日の新しい順でカードをDOM生成
  - [x] 各カードにサムネイル（`img.youtube.com/vi/{video_id}/mqdefault.jpg`）、曲数バッジ、配信日、タイトル、曲数を表示
  - [x] カードクリックでセットリストを展開/折りたたみ（max-heightアニメーション）
  - [x] セットリスト内に曲番号・曲名・アーティスト・タイムスタンプ・再生ボタンを表示
  - [x] 再生ボタンクリックでYouTube `?t=秒数` を新タブで開く

### Task 8: 楽曲一覧の描画
- **ID**: T-8
- **Priority**: P0
- **Depends on**: T-6
- **Files**: `site/js/app.js`
- **Scope**: `renderSongs()`, `handleSort()`, `toggleSongDetail()`
- **Acceptance Criteria**:
  - [x] songIndexからテーブルをDOM生成（曲名・アーティスト・歌唱回数・最新歌唱日）
  - [x] ソートボタンで曲名順/回数順/最新日順を切り替え
  - [x] 行クリックで出演配信一覧を展開（日付・配信名・タイムスタンプ・再生ボタン）
  - [x] 再生ボタンクリックでYouTube `?t=秒数` を新タブで開く

### Task 9: タブ切り替えと検索
- **ID**: T-9
- **Priority**: P0
- **Depends on**: T-7, T-8
- **Files**: `site/js/app.js`
- **Scope**: Tab切り替え, `handleSearch()`
- **Acceptance Criteria**:
  - [x] タブボタンクリックで `.active` クラスを切り替え、対応する `.tab-content` を表示/非表示
  - [x] 検索入力でインクリメンタルサーチ（inputイベントで即時フィルタリング）
  - [x] 歌枠一覧タブ: セトリ内の曲名・アーティストにマッチするカードのみ表示
  - [x] 楽曲一覧タブ: 曲名・アーティストにマッチする行のみ表示
  - [x] 検索結果件数を表示

## Wave 4 — デプロイ

### Task 10: GitHub Actions ワークフロー作成
- **ID**: T-10
- **Priority**: P0
- **Depends on**: T-4
- **Files**: `.github/workflows/deploy.yml`
- **Acceptance Criteria**:
  - [x] `cron` (毎時) と `workflow_dispatch` (手動) の両トリガーを設定
  - [x] Node.jsセットアップ → `npm install` → `node scripts/fetch-sheets.js`
  - [x] `site/` と生成された `data/` をマージした出力ディレクトリを構成
  - [x] `gh-pages` ブランチへデプロイ（peaceiris/actions-gh-pages）
  - [x] Secrets（`GOOGLE_API_KEY`, `SPREADSHEET_ID`）を参照

## Wave 5 — 運用補助ツール / 識別情報更新

### Task 11: スプレッドシート元データ取得スクリプト（補助）
- **ID**: T-11
- **Priority**: P1
- **Depends on**: なし
- **Files**: `scripts/fetch-youtube/fetch_utawaku.py`, `scripts/fetch-youtube/.env`, `.gitignore`
- **Acceptance Criteria**:
  - [x] `scripts/` 配下を `fetch-sheets/` と `fetch-youtube/` の対称構成に再編
  - [x] `.github/workflows/deploy.yml` と `package.json` の参照パスを更新
  - [x] `fetch-sheets.js` の `DATA_DIR` を `../../data` に修正
  - [x] YouTube Data API v3 でチャンネル（夜猫アヤ）の動画を取得
  - [x] タイトルに「歌枠」を含む動画のみ抽出 → `utawaku_list.csv` に出力
  - [x] `API_KEY` / `CHANNEL_ID` を `.env` から読み込み（`python-dotenv`）
  - [x] ローカル実行で41件の抽出を確認

### Task 12: サイト識別情報の更新（change-20260413）
- **ID**: T-12
- **Priority**: P0
- **Depends on**: T-2
- **Files**: `site/index.html`, `site/js/app.js`, `site/css/style.css`
- **Acceptance Criteria**:
  - [x] ヘッダーのサイトタイトルを「夜猫歌枠あーかいぶ」に変更（英語表記を削除）
  - [x] サブタイトルを2行に変更（Pastel Live所属… / このサイトは非公式のファンサイトです。）
  - [x] Stats Bar から Unique 列を削除
  - [x] `app.js` の `statUnique` 更新処理を削除
  - [x] フッター権利表記を change-20260413 の文言に更新

### Task 13: UI視認性・スクロール挙動の改修（change-20260415）
- **ID**: T-13
- **Priority**: P0
- **Depends on**: T-3, T-12
- **Files**: `site/index.html`, `site/css/style.css`
- **Acceptance Criteria**:
  - [x] Stats Bar の `.stat-label`（STREAMS / SONGS）を本文色ベースに変更し視認性を上げる（NFR-2.5）
  - [x] `search-section` と `nav-tabs` を `.sticky-controls` ラッパで包み、`position: sticky; top: 0` でビューポート上端に固定する（NFR-1b）
  - [x] sticky ラッパは body と同色で不透明化し、下端ボーダーで境界を示す
  - [x] フッターの `.footer-text` / `.footer-note` を白系（`--neutral-100`）に変更する（NFR-2.6）
  - [x] `.streams-grid` を `repeat(auto-fill, minmax(230px, 1fr))` + `gap:16px` に変更し、デスクトップ幅で最大4カード/行表示にする（NFR-2.7）

### Task 14: おすすめ曲（ランダム再生）タブ追加（change-20260415b）
- **ID**: T-14
- **Priority**: P1
- **Depends on**: T-6, T-9
- **Files**: `mockup.html`, `site/index.html`, `site/css/style.css`, `site/js/app.js`
- **Acceptance Criteria**:
  - [x] ナビタブに「おすすめ曲（ランダム再生）」を追加（`data-tab="recommend"`、初期activeで先頭配置）
  - [x] `#tab-recommend` コンテナと `.recommend-grid` を用意
  - [x] `app.js` で初回ロード時に `setlists` から重複なし3件を抽選（`pickRecommendations()`）し、モジュール変数 `recommendPicks` に保持
  - [x] `renderRecommend()` で各カードにサムネ・曲名（`--gold-100`）・アーティスト（`--gold-100` / 低opacity）・再生ボタンを描画
  - [x] 再生ボタン押下で `youtube_url?t=秒数` を新タブで開く
  - [x] タブ切替では再抽選せず、ページリロード時のみ更新される
  - [x] 検索ボックスはおすすめタブでは非アクティブ（ヒット件数表示クリア）
  - [x] `.nav-tabs` max-width を検索バーと同じ 600px に揃え、`.nav-tab` に `white-space: nowrap`
