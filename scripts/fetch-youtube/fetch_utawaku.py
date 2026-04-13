"""
YouTube歌枠配信リスト取得スクリプト

【事前準備】
1. Google Cloud Console (https://console.cloud.google.com/) でプロジェクトを作成
2. YouTube Data API v3 を有効化
3. APIキーを作成
4. このスクリプトと同じディレクトリに `.env` を作成し、以下を記述:
     API_KEY=取得したAPIキー
     CHANNEL_ID=対象チャンネルID

【必要ライブラリ】
pip install google-api-python-client python-dotenv

【使い方】
python fetch_utawaku.py
"""

import csv
import os
import sys
from datetime import datetime

from dotenv import load_dotenv
from googleapiclient.discovery import build

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

# ============================================================
# 設定
# ============================================================
API_KEY = os.getenv("API_KEY")              # .env から読み込み
CHANNEL_ID = os.getenv("CHANNEL_ID")        # .env から読み込み
SEARCH_KEYWORD = "歌枠"             # タイトルに含むキーワード
OUTPUT_FILE = "utawaku_list.csv"        # 出力ファイル名
# ============================================================


def get_channel_uploads_playlist(youtube, channel_id):
    """チャンネルの『アップロード済み』プレイリストIDを取得"""
    resp = youtube.channels().list(
        part="contentDetails",
        id=channel_id,
    ).execute()

    if not resp.get("items"):
        print(f"エラー: チャンネル {channel_id} が見つかりません。")
        sys.exit(1)

    return resp["items"][0]["contentDetails"]["relatedPlaylists"]["uploads"]


def get_all_videos(youtube, playlist_id):
    """プレイリスト内の全動画IDを取得"""
    video_ids = []
    next_page = None

    while True:
        resp = youtube.playlistItems().list(
            part="contentDetails",
            playlistId=playlist_id,
            maxResults=50,
            pageToken=next_page,
        ).execute()

        for item in resp["items"]:
            video_ids.append(item["contentDetails"]["videoId"])

        next_page = resp.get("nextPageToken")
        if not next_page:
            break

    print(f"チャンネル内の動画数: {len(video_ids)}")
    return video_ids


def get_video_details(youtube, video_ids):
    """動画の詳細情報を50件ずつ取得"""
    all_details = []

    for i in range(0, len(video_ids), 50):
        batch = video_ids[i : i + 50]
        resp = youtube.videos().list(
            part="snippet,liveStreamingDetails",
            id=",".join(batch),
        ).execute()
        all_details.extend(resp.get("items", []))

    return all_details


def main():
    if not API_KEY:
        print("エラー: .env に YOUTUBE_API_KEY を設定してください。")
        sys.exit(1)
    if not CHANNEL_ID:
        print("エラー: CHANNEL_ID を設定してください。")
        sys.exit(1)

    youtube = build("youtube", "v3", developerKey=API_KEY)

    # 1. アップロードプレイリストを取得
    print("チャンネル情報を取得中...")
    playlist_id = get_channel_uploads_playlist(youtube, CHANNEL_ID)

    # 2. 全動画IDを取得
    print("動画一覧を取得中...")
    video_ids = get_all_videos(youtube, playlist_id)

    # 3. 動画の詳細を取得
    print("動画の詳細を取得中...")
    details = get_video_details(youtube, video_ids)

    # 4. 「歌枠」を含むライブ配信をフィルタリング
    utawaku_list = []
    for video in details:
        snippet = video["snippet"]
        title = snippet.get("title", "")

        if SEARCH_KEYWORD not in title:
            continue

        video_id = video["id"]
        published = snippet.get("publishedAt", "")
        description = snippet.get("description", "")
        url = f"https://www.youtube.com/watch?v={video_id}"

        # 配信日をフォーマット
        try:
            dt = datetime.fromisoformat(published.replace("Z", "+00:00"))
            date_str = dt.strftime("%Y-%m-%d %H:%M")
        except Exception:
            date_str = published

        # 概要欄は最初の500文字まで（長すぎる場合）
        desc_short = description[:500].replace("\n", " ") if description else ""

        utawaku_list.append({
            "配信日": date_str,
            "タイトル": title,
            "URL": url,
            "概要": desc_short,
        })

    # 日付順にソート（古い順）
    utawaku_list.sort(key=lambda x: x["配信日"])

    # 5. CSV出力
    with open(OUTPUT_FILE, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=["配信日", "タイトル", "URL", "概要"])
        writer.writeheader()
        writer.writerows(utawaku_list)

    print(f"\n完了！ 「{SEARCH_KEYWORD}」を含む配信: {len(utawaku_list)} 件")
    print(f"出力ファイル: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
