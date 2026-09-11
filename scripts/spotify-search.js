import fs from 'fs';
import { CLIENT_ID, CLIENT_SECRET } from './spotify-config.js';

const DATA_FILES = [
  { group: 'skz', file: 'data/skz.json' },
  { group: 'bts', file: 'data/bts.json' },
  { group: 'ateez', file: 'data/ateez.json' },
  { group: 'enhypen', file: 'data/enhypen.json' }
];

const groupNames = {
  skz: 'Stray Kids',
  bts: 'BTS',
  ateez: 'Ateez',
  enhypen: 'Enhypen'
};

function normalize(str) {
  return str
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

async function getAccessToken() {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64'),
    },
    body: 'grant_type=client_credentials',
  });
  const data = await res.json();
  if (!data.access_token) {
    throw new Error('Failed to get access token: ' + JSON.stringify(data));
  }
  return data.access_token;
}

async function searchSpotify(title, artist, token) {
  const query = encodeURIComponent(`${title} ${artist}`);
  const url = `https://api.spotify.com/v1/search?q=${query}&type=track&limit=5`;

  try {
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const data = await res.json();

    if (!data.tracks || data.tracks.items.length === 0) {
      return { found: false };
    }

    const normalizedTarget = normalize(title);
    const exactMatch = data.tracks.items.find(t => normalize(t.name) === normalizedTarget);
    const best = exactMatch || data.tracks.items[0];

    return {
      found: true,
      matchedTrackName: best.name,
      matchedArtist: best.artists.map(a => a.name).join(', '),
      spotifyUrl: best.external_urls.spotify,
      needsReview: !exactMatch
    };
  } catch (err) {
    return { found: false, error: err.message };
  }
}

async function run() {
  console.log('Authenticating with Spotify...');
  const token = await getAccessToken();
  console.log('Authenticated.\n');

  const allResults = [];

  for (const source of DATA_FILES) {
    const songs = JSON.parse(fs.readFileSync(source.file, 'utf8'));
    console.log(`\n--- ${source.file} (${songs.length} songs) ---\n`);

    for (const song of songs) {
      if (song.links && song.links.spotify) {
        continue;
      }

      const artist = song.artist || groupNames[source.group];
      const result = await searchSpotify(song.title, artist, token);

      const entry = {
        file: source.file,
        title: song.title,
        artist,
        ...result
      };
      allResults.push(entry);

      const status = result.error ? '✗ ERROR'
        : !result.found ? '✗ NOT FOUND'
        : result.needsReview ? '⚠️  NEEDS REVIEW'
        : '✓';
      console.log(`${status} ${song.title}${result.matchedTrackName ? ' → ' + result.matchedTrackName : ''}`);

      fs.writeFileSync('spotify-results.json', JSON.stringify(allResults, null, 2));

      await new Promise(r => setTimeout(r, 500));
    }
  }

  const notFound = allResults.filter(r => !r.found).length;
  const needsReview = allResults.filter(r => r.needsReview).length;
  console.log(`\nDone. ${notFound} not found, ${needsReview} matched but flagged for review.`);
  console.log('Saved to spotify-results.json — review flagged entries before merging.');
}

run();