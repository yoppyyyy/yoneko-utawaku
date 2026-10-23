// ============================================================
// Data & State
// ============================================================
let streams = [];
let setlists = [];
let songIndex = [];
let currentSort = 'date';
let currentStreamSort = 'new';
let recommendPicks = [];

// ============================================================
// Utilities
// ============================================================
function extractVideoId(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return '';
    let id = '';
    if (url.hostname === 'youtu.be') {
      id = url.pathname.slice(1);
    } else if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com'].includes(url.hostname)) {
      if (url.pathname === '/watch') id = url.searchParams.get('v') || '';
      else id = url.pathname.match(/^\/(?:live|shorts|embed)\/([^/]+)$/)?.[1] || '';
    }
    return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : '';
  } catch {
    return '';
  }
}

function buildPlaybackUrl(value, seconds) {
  const id = extractVideoId(value);
  if (!id || typeof seconds !== 'number' || !Number.isSafeInteger(seconds) || seconds < 0) return '';
  const url = new URL('https://www.youtube.com/watch');
  url.searchParams.set('v', id);
  url.searchParams.set('t', String(seconds));
  return url.href;
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = String(text ?? '');
  return node;
}

function playButton(url, seconds) {
  const button = element('button', 'play-btn', '▶');
  button.type = 'button';
  const href = buildPlaybackUrl(url, seconds);
  button.disabled = !href;
  button.title = href ? 'この曲から再生' : '再生URLまたは時刻が不正です';
  button.addEventListener('click', event => {
    event.stopPropagation();
    if (href) window.open(href, '_blank', 'noopener,noreferrer');
  });
  return button;
}

function thumbnail(url, className) {
  const img = element('img', className);
  img.alt = '';
  const id = extractVideoId(url);
  const fallback = () => {
    img.removeAttribute('src');
    img.style.background = 'linear-gradient(135deg, var(--primary-900), var(--accent-700))';
    img.style.aspectRatio = '16 / 9';
  };
  img.addEventListener('error', fallback, { once: true });
  if (id) img.src = `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
  else fallback();
  return img;
}

function formatTimestamp(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
}

function formatDate(dateStr) {
  return dateStr.replace(/-/g, '.');
}

// ============================================================
// Data Processing
// ============================================================
function buildSongIndex(streams, setlists) {
  const map = Object.create(null);
  const streamsMap = Object.create(null);
  streams.forEach(s => { streamsMap[s.stream_id] = s; });

  setlists.forEach(item => {
    const key = JSON.stringify([item.song_title, item.artist]);
    if (!map[key]) {
      map[key] = {
        song_title: item.song_title,
        artist: item.artist,
        count: 0,
        latest_date: '',
        appearances: [],
      };
    }
    const entry = map[key];
    const stream = streamsMap[item.stream_id];
    entry.count++;
    if (stream) {
      if (stream.date > entry.latest_date) {
        entry.latest_date = stream.date;
      }
      entry.appearances.push({
        date: stream.date,
        title: stream.title,
        youtube_url: stream.youtube_url,
        video_id: stream.video_id || extractVideoId(stream.youtube_url || ''),
        timestamp: item.timestamp,
        seconds: item.seconds,
      });
    }
  });

  return Object.values(map).map(entry => {
    entry.appearances.sort((a, b) => b.date.localeCompare(a.date));
    return entry;
  });
}

function updateStats() {
  document.getElementById('statStreams').textContent = streams.length;
  document.getElementById('statSongs').textContent = setlists.length;
}

// ============================================================
// Rendering — Streams (C-5, C-6)
// ============================================================
function sortStreams(list, key) {
  const arr = [...list];
  if (key === 'old') {
    return arr.sort((a, b) => a.date.localeCompare(b.date));
  }
  return arr.sort((a, b) => b.date.localeCompare(a.date));
}

function renderStreams() {
  const grid = document.getElementById('streamsGrid');
  grid.replaceChildren(...sortStreams(streams, currentStreamSort).map(stream => {
    const items = setlists.filter(s => s.stream_id === stream.stream_id).sort((a, b) => a.track_no - b.track_no);
    const card = element('div', 'stream-card');
    card.addEventListener('click', () => card.classList.toggle('expanded'));
    const wrapper = element('div', 'stream-thumbnail-wrapper');
    wrapper.append(thumbnail(stream.youtube_url, 'stream-thumbnail'), element('span', 'stream-badge', `${items.length}曲`));
    const info = element('div', 'stream-info');
    info.append(element('div', 'stream-date', formatDate(stream.date)), element('div', 'stream-title', stream.title), element('div', 'stream-song-count', `${items.length}曲`));
    const list = element('div', 'setlist');
    const inner = element('div', 'setlist-inner');
    items.forEach(item => {
      const row = element('div', 'setlist-item');
      const song = element('div', 'setlist-song');
      song.append(element('div', 'setlist-song-title', item.song_title), element('div', 'setlist-artist', item.artist));
      row.append(song, element('span', 'setlist-time', item.timestamp), playButton(stream.youtube_url, item.seconds));
      inner.append(row);
    });
    list.append(inner);
    card.append(wrapper, info, list);
    return card;
  }));
}

// ============================================================
// Rendering — Recommend (C-9)
// ============================================================
function pickRecommendations(n = 3) {
  const streamsMap = Object.create(null);
  streams.forEach(s => { streamsMap[s.stream_id] = s; });

  const pool = setlists
    .map(item => {
      const stream = streamsMap[item.stream_id];
      if (!stream) return null;
      return {
        song_title: item.song_title,
        artist: item.artist,
        seconds: item.seconds,
        timestamp: item.timestamp,
        youtube_url: stream.youtube_url,
        video_id: stream.video_id || extractVideoId(stream.youtube_url || ''),
        stream_title: stream.title,
      };
    })
    .filter(Boolean);

  const seen = new Set();
  const unique = [];
  for (const item of pool) {
    const key = JSON.stringify([item.song_title, item.artist]);
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(item);
    }
  }

  for (let i = unique.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [unique[i], unique[j]] = [unique[j], unique[i]];
  }
  return unique.slice(0, n);
}

function renderRecommend() {
  const grid = document.getElementById('recommendGrid');
  if (!grid) return;
  if (!recommendPicks.length) {
    grid.replaceChildren(element('div', 'recommend-lead', 'おすすめできる曲がありません'));
    return;
  }
  grid.replaceChildren(...recommendPicks.map(item => {
    const card = element('div', 'recommend-card');
    const wrapper = element('div', 'recommend-thumb-wrapper');
    wrapper.append(thumbnail(item.youtube_url, 'recommend-thumbnail'));
    const info = element('div', 'recommend-info');
    const text = element('div', 'recommend-text');
    text.append(element('div', 'recommend-song-title', item.song_title), element('div', 'recommend-artist', item.artist));
    info.append(text, playButton(item.youtube_url, item.seconds));
    card.append(wrapper, info);
    return card;
  }));
}

// ============================================================
// Rendering — Songs (C-7)
// ============================================================
function renderSongs() {
  const rows = [];
  sortSongIndex(songIndex, currentSort).forEach(song => {
    const row = element('tr');
    for (const [className, text] of [['song-name', song.song_title], ['song-artist-cell', song.artist], ['song-count', `♪ ${song.count}回`], ['song-last-date', formatDate(song.latest_date)]]) {
      const cell = element('td');
      cell.append(element('span', className, text));
      row.append(cell);
    }
    const detail = element('tr', 'song-detail-row');
    detail.style.display = 'none';
    row.addEventListener('click', () => { detail.style.display = detail.style.display === 'none' ? '' : 'none'; });
    const cell = element('td');
    cell.colSpan = 4;
    const appearances = element('div', 'song-appearances');
    appearances.append(element('h4', '', '歌唱された配信'));
    song.appearances.forEach(a => {
      const item = element('div', 'appearance-item');
      item.append(element('span', 'appearance-date', formatDate(a.date)), element('span', 'appearance-stream', a.title), element('span', 'appearance-time', a.timestamp), playButton(a.youtube_url, a.seconds));
      appearances.append(item);
    });
    cell.append(appearances);
    detail.append(cell);
    rows.push(row, detail);
  });
  document.getElementById('songsBody').replaceChildren(...rows);
}

function sortSongIndex(index, key) {
  const arr = [...index];
  switch (key) {
    case 'name':
      return arr.sort((a, b) => a.song_title.localeCompare(b.song_title, 'ja'));
    case 'count':
      return arr.sort((a, b) => b.count - a.count || a.song_title.localeCompare(b.song_title, 'ja'));
    case 'date':
      return arr.sort((a, b) => b.latest_date.localeCompare(a.latest_date) || a.song_title.localeCompare(b.song_title, 'ja'));
    default:
      return arr;
  }
}

function handleSort(key) {
  currentSort = key;
  document.querySelectorAll('.songs-header .sort-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.sort === key);
  });
  renderSongs();
  handleSearch(document.getElementById('searchInput').value);
}

function handleStreamSort(key) {
  currentStreamSort = key;
  document.querySelectorAll('.streams-header .sort-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.streamSort === key);
  });
  renderStreams();
  handleSearch(document.getElementById('searchInput').value);
}

// ============================================================
// Tab Switching (C-4)
// ============================================================
function updateSearchVisibility(tabName) {
  const section = document.querySelector('.search-section');
  if (!section) return;
  section.style.display = tabName === 'recommend' ? 'none' : '';
}

function initTabs() {
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
      updateSearchVisibility(tab.dataset.tab);
      handleSearch(document.getElementById('searchInput').value);
    });
  });
  const activeTab = document.querySelector('.nav-tab.active');
  if (activeTab) updateSearchVisibility(activeTab.dataset.tab);
}

// ============================================================
// Search (C-3)
// ============================================================
function handleSearch(query) {
  query = query.toLowerCase().trim();
  const activeTab = document.querySelector('.nav-tab.active').dataset.tab;
  const searchCount = document.getElementById('searchCount');

  if (activeTab === 'recommend') {
    searchCount.textContent = '';
    return;
  }

  if (activeTab === 'streams') {
    const cards = document.querySelectorAll('.stream-card');
    let count = 0;
    cards.forEach(card => {
      if (!query) {
        card.style.display = '';
        count++;
        return;
      }
      const items = card.querySelectorAll('.setlist-item');
      let match = false;
      items.forEach(item => {
        const title = item.querySelector('.setlist-song-title');
        const artist = item.querySelector('.setlist-artist');
        if ((title && title.textContent.toLowerCase().includes(query)) ||
            (artist && artist.textContent.toLowerCase().includes(query))) {
          match = true;
        }
      });
      // Also check stream title
      const streamTitle = card.querySelector('.stream-title');
      if (streamTitle && streamTitle.textContent.toLowerCase().includes(query)) {
        match = true;
      }
      card.style.display = match ? '' : 'none';
      if (match) count++;
    });
    searchCount.textContent = query ? `${count} 件ヒット` : '';
  } else {
    const rows = document.querySelectorAll('#songsBody tr:not(.song-detail-row)');
    let count = 0;
    rows.forEach(row => {
      const name = row.querySelector('.song-name');
      const artist = row.querySelector('.song-artist-cell');
      const match = !query ||
        (name && name.textContent.toLowerCase().includes(query)) ||
        (artist && artist.textContent.toLowerCase().includes(query));
      row.style.display = match ? '' : 'none';
      // Hide detail row too
      const detailRow = row.nextElementSibling;
      if (detailRow && detailRow.classList.contains('song-detail-row')) {
        detailRow.style.display = 'none';
      }
      if (match) count++;
    });
    searchCount.textContent = query ? `${count} 件ヒット` : '';
  }
}

function initSearch() {
  document.getElementById('searchInput').addEventListener('input', (e) => {
    handleSearch(e.target.value);
  });
}

// ============================================================
// Sort buttons
// ============================================================
function initSort() {
  document.querySelectorAll('.songs-header .sort-btn').forEach(btn => {
    btn.addEventListener('click', () => handleSort(btn.dataset.sort));
  });
}

function initStreamSort() {
  document.querySelectorAll('.streams-header .sort-btn').forEach(btn => {
    btn.addEventListener('click', () => handleStreamSort(btn.dataset.streamSort));
  });
}

// ============================================================
// Init
// ============================================================
async function init() {
  try {
    const [streamsRes, setlistsRes] = await Promise.all([
      fetch('./data/streams.json'),
      fetch('./data/setlists.json'),
    ]);
    streams = await streamsRes.json();
    setlists = await setlistsRes.json();
  } catch (err) {
    console.error('Failed to load data:', err);
    return;
  }

  songIndex = buildSongIndex(streams, setlists);
  recommendPicks = pickRecommendations(3);

  updateStats();
  renderRecommend();
  renderStreams();
  renderSongs();
  initTabs();
  initSearch();
  initSort();
  initStreamSort();
}

init();
