// ============================================================
// Data & State
// ============================================================
let streams = [];
let setlists = [];
let songIndex = [];
let currentSort = 'name';

// ============================================================
// Utilities
// ============================================================
function extractVideoId(url) {
  const match = url.match(/[?&]v=([^&]+)/) || url.match(/youtu\.be\/([^?&]+)/);
  return match ? match[1] : '';
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
  const map = {};
  const streamsMap = {};
  streams.forEach(s => { streamsMap[s.stream_id] = s; });

  setlists.forEach(item => {
    const key = `${item.song_title}___${item.artist}`;
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
  const uniqueSongs = new Set(setlists.map(s => `${s.song_title}___${s.artist}`));
  document.getElementById('statStreams').textContent = streams.length;
  document.getElementById('statSongs').textContent = setlists.length;
  document.getElementById('statUnique').textContent = uniqueSongs.size;
}

// ============================================================
// Rendering — Streams (C-5, C-6)
// ============================================================
function renderStreams() {
  const grid = document.getElementById('streamsGrid');
  const sorted = [...streams].sort((a, b) => b.date.localeCompare(a.date));

  grid.innerHTML = sorted.map(stream => {
    const videoId = stream.video_id || extractVideoId(stream.youtube_url || '');
    const streamSetlist = setlists
      .filter(s => s.stream_id === stream.stream_id)
      .sort((a, b) => a.track_no - b.track_no);
    const songCount = streamSetlist.length;

    const setlistHtml = streamSetlist.map(item => `
      <div class="setlist-item">
        <span class="setlist-no">${item.track_no}</span>
        <div class="setlist-song">
          <div class="setlist-song-title">${item.song_title}</div>
          <div class="setlist-artist">${item.artist}</div>
        </div>
        <span class="setlist-time">${item.timestamp}</span>
        <button class="play-btn" title="この曲から再生"
                onclick="event.stopPropagation(); window.open('${stream.youtube_url}&t=${item.seconds}', '_blank')">▶</button>
      </div>
    `).join('');

    return `
      <div class="stream-card" onclick="toggleSetlist(this)">
        <div class="stream-thumbnail-wrapper">
          <img class="stream-thumbnail"
               src="https://img.youtube.com/vi/${videoId}/mqdefault.jpg"
               alt=""
               onerror="this.style.background='linear-gradient(135deg, var(--primary-900), var(--accent-700))'; this.style.height='180px'; this.src='';">
          <span class="stream-badge">${songCount}曲</span>
        </div>
        <div class="stream-info">
          <div class="stream-date">${formatDate(stream.date)}</div>
          <div class="stream-title">${stream.title}</div>
          <div class="stream-song-count">${songCount}曲</div>
        </div>
        <div class="setlist">
          <div class="setlist-inner">
            ${setlistHtml}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function toggleSetlist(card) {
  if (event.target.closest('.play-btn')) return;
  card.classList.toggle('expanded');
}

// ============================================================
// Rendering — Songs (C-7)
// ============================================================
function renderSongs() {
  const sorted = sortSongIndex(songIndex, currentSort);
  const tbody = document.getElementById('songsBody');

  tbody.innerHTML = sorted.map(song => {
    const appearancesHtml = song.appearances.map(a => `
      <div class="appearance-item">
        <span class="appearance-date">${formatDate(a.date)}</span>
        <span class="appearance-stream">${a.title}</span>
        <span class="appearance-time">${a.timestamp}</span>
        <button class="play-btn" title="この曲から再生"
                onclick="event.stopPropagation(); window.open('${a.youtube_url}&t=${a.seconds}', '_blank')">▶</button>
      </div>
    `).join('');

    return `
      <tr onclick="toggleSongDetail(this)">
        <td><span class="song-name">${song.song_title}</span></td>
        <td><span class="song-artist-cell">${song.artist}</span></td>
        <td><span class="song-count">♪ ${song.count}回</span></td>
        <td><span class="song-last-date">${formatDate(song.latest_date)}</span></td>
      </tr>
      <tr class="song-detail-row" style="display:none;">
        <td colspan="4">
          <div class="song-appearances">
            <h4>歌唱された配信</h4>
            ${appearancesHtml}
          </div>
        </td>
      </tr>
    `;
  }).join('');
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
  document.querySelectorAll('.sort-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.sort === key);
  });
  renderSongs();
}

function toggleSongDetail(row) {
  if (event.target.closest('.play-btn')) return;
  const detailRow = row.nextElementSibling;
  if (detailRow && detailRow.classList.contains('song-detail-row')) {
    detailRow.style.display = detailRow.style.display === 'none' ? '' : 'none';
  }
}

// ============================================================
// Tab Switching (C-4)
// ============================================================
function initTabs() {
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
      handleSearch(document.getElementById('searchInput').value);
    });
  });
}

// ============================================================
// Search (C-3)
// ============================================================
function handleSearch(query) {
  query = query.toLowerCase().trim();
  const activeTab = document.querySelector('.nav-tab.active').dataset.tab;
  const searchCount = document.getElementById('searchCount');

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
  document.querySelectorAll('.sort-btn').forEach(btn => {
    btn.addEventListener('click', () => handleSort(btn.dataset.sort));
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

  updateStats();
  renderStreams();
  renderSongs();
  initTabs();
  initSearch();
  initSort();
}

init();
