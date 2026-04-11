require('dotenv').config();
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const API_KEY = process.env.GOOGLE_API_KEY;
const DATA_DIR = path.join(__dirname, '..', 'data');

if (!SPREADSHEET_ID || !API_KEY) {
  console.error('Error: SPREADSHEET_ID and GOOGLE_API_KEY must be set');
  process.exit(1);
}

const sheets = google.sheets({ version: 'v4', auth: API_KEY });

async function fetchSheet(sheetName) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: sheetName,
  });
  const rows = res.data.values;
  if (!rows || rows.length < 2) {
    console.warn(`Warning: sheet "${sheetName}" is empty or has no data rows`);
    return [];
  }
  const headers = rows[0];
  return rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = row[i] || '';
    });
    return obj;
  });
}

function extractVideoId(url) {
  const match = url.match(/[?&]v=([^&]+)/) || url.match(/youtu\.be\/([^?&]+)/);
  return match ? match[1] : '';
}

function transformStreams(rows) {
  return rows.map(row => ({
    stream_id: row.stream_id,
    date: row.date,
    title: row.title,
    youtube_url: row.youtube_url,
    video_id: extractVideoId(row.youtube_url || ''),
    description: row.description || '',
  }));
}

function transformSetlists(rows) {
  return rows.map(row => ({
    stream_id: row.stream_id,
    track_no: Number(row.track_no),
    song_title: row.song_title,
    artist: row.artist,
    timestamp: row.timestamp,
    seconds: Number(row.seconds),
  }));
}

function writeJson(filename, data) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const filepath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`Written: ${filepath} (${data.length} records)`);
}

async function main() {
  console.log('Fetching data from Google Sheets...');

  const [streamsRaw, setlistsRaw] = await Promise.all([
    fetchSheet('streams'),
    fetchSheet('setlists'),
  ]);

  const streams = transformStreams(streamsRaw);
  const setlists = transformSetlists(setlistsRaw);

  writeJson('streams.json', streams);
  writeJson('setlists.json', setlists);

  console.log('Done!');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
