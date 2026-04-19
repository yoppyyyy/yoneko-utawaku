require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.API_KEY;
const CHANNEL_ID = process.env.CHANNEL_ID;
const SEARCH_KEYWORD = '歌枠';
const OUTPUT_FILE = path.join(__dirname, 'utawaku_list.csv');

if (!API_KEY) {
  console.error('エラー: .env に API_KEY を設定してください。');
  process.exit(1);
}
if (!CHANNEL_ID) {
  console.error('エラー: CHANNEL_ID を設定してください。');
  process.exit(1);
}

const youtube = google.youtube({ version: 'v3', auth: API_KEY });

async function getChannelUploadsPlaylist(channelId) {
  const resp = await youtube.channels.list({
    part: ['contentDetails'],
    id: [channelId],
  });
  const items = resp.data.items;
  if (!items || items.length === 0) {
    console.error(`エラー: チャンネル ${channelId} が見つかりません。`);
    process.exit(1);
  }
  return items[0].contentDetails.relatedPlaylists.uploads;
}

async function getAllVideos(playlistId) {
  const videoIds = [];
  let pageToken = undefined;

  while (true) {
    const resp = await youtube.playlistItems.list({
      part: ['contentDetails'],
      playlistId,
      maxResults: 50,
      pageToken,
    });
    for (const item of resp.data.items) {
      videoIds.push(item.contentDetails.videoId);
    }
    pageToken = resp.data.nextPageToken;
    if (!pageToken) break;
  }

  console.log(`チャンネル内の動画数: ${videoIds.length}`);
  return videoIds;
}

async function getVideoDetails(videoIds) {
  const allDetails = [];
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    const resp = await youtube.videos.list({
      part: ['snippet', 'liveStreamingDetails'],
      id: batch,
    });
    allDetails.push(...(resp.data.items || []));
  }
  return allDetails;
}

function formatDate(published) {
  const dt = new Date(published);
  if (isNaN(dt.getTime())) return published;
  const pad = n => String(n).padStart(2, '0');
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())} ${pad(dt.getUTCHours())}:${pad(dt.getUTCMinutes())}`;
}

function csvEscape(value) {
  const s = String(value ?? '');
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function writeCsv(filepath, headers, rows) {
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map(h => csvEscape(row[h])).join(','));
  }
  fs.writeFileSync(filepath, '\uFEFF' + lines.join('\n') + '\n', 'utf-8');
}

async function main() {
  console.log('チャンネル情報を取得中...');
  const playlistId = await getChannelUploadsPlaylist(CHANNEL_ID);

  console.log('動画一覧を取得中...');
  const videoIds = await getAllVideos(playlistId);

  console.log('動画の詳細を取得中...');
  const details = await getVideoDetails(videoIds);

  const utawakuList = [];
  for (const video of details) {
    const snippet = video.snippet || {};
    const title = snippet.title || '';
    if (!title.includes(SEARCH_KEYWORD)) continue;

    const videoId = video.id;
    const published = snippet.publishedAt || '';
    const description = snippet.description || '';
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    const dateStr = formatDate(published);
    const descShort = description.slice(0, 500).replace(/\n/g, ' ');

    utawakuList.push({
      配信日: dateStr,
      タイトル: title,
      URL: url,
      概要: descShort,
    });
  }

  utawakuList.sort((a, b) => a.配信日.localeCompare(b.配信日));

  writeCsv(OUTPUT_FILE, ['配信日', 'タイトル', 'URL', '概要'], utawakuList);

  console.log(`\n完了！ 「${SEARCH_KEYWORD}」を含む配信: ${utawakuList.length} 件`);
  console.log(`出力ファイル: ${OUTPUT_FILE}`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
