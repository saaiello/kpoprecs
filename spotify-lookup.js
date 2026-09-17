import fs from 'fs';
import { CLIENT_ID, CLIENT_SECRET } from './scripts/spotify-config.js';

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

function stripParens(str) {
  return str.replace(/\(.*?\)/g, '');
}

function extractParenContent(str) {
  const matches = [...str.matchAll(/\(([^)]*)\)/g)];
  return matches.map(m => m[1]).join(' ');
}

// Same fix as tonight's iTunes script: if nothing usable is left outside the
// parentheses (e.g. "안개 (Mist)" -> Korean stripped, parens stripped -> ""),
// the parenthetical IS the real title, not a version/feat tag to discard.
function normalize(str) {
  const lower = str.toLowerCase();
  const outside = stripParens(lower).replace(/[^a-z0-9\s]/g, '').trim();
  if (outside) return outside;
  return extractParenContent(lower).replace(/[^a-z0-9\s]/g, '').trim();
}

// Guards against the empty-string-equals-empty-string false positive:
// two different Korean-only titles could otherwise both normalize to ""
// and incorrectly register as an "exact match."
function safeExactMatch(normalizedA, normalizedB) {
  if (!normalizedA || !normalizedB) return false;
  return normalizedA === normalizedB;
}

function artistMatches(trackArtists, expectedArtist, groupName) {
  const names = trackArtists.map(a => a.name.toLowerCase());
  const candidates = [groupName.toLowerCase()];
  if (expectedArtist) candidates.push(expectedArtist.toLowerCase());
  return names.some(n => candidates.some(c => n.includes(c) || c.includes(n)));
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

async function searchSpotify(title, artist, groupName, token, retriesLeft = 3) {
  const query = encodeURIComponent(`${title} ${artist}`);
  const url = `https://api.spotify.com/v1/search?q=${query}&type=track&limit=5`;

  try {
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    // Spotify tells you exactly how long to wait -- use that instead of guessing
    if (res.status === 429) {
      if (retriesLeft <= 0) {
        return { found: false, error: 'rate limited, out of retries' };
      }
      const retryAfter = parseInt(res.headers.get('Retry-After') || '5', 10);
      console.log(`    (rate limited, waiting ${retryAfter}s per Spotify's Retry-After header...)`);
      await new Promise(r => setTimeout(r, (retryAfter + 1) * 1000));
      return searchSpotify(title, artist, groupName, token, retriesLeft - 1);
    }

    const data = await res.json();

    if (!data.tracks || data.tracks.items.length === 0) {
      return { found: false };
    }

    const normalizedTarget = normalize(title);

    // Only accept a track as an "exact match" if it ALSO passes artist verification --
    // this is what would have caught Justin Bieber's "Baby" and Black Sabbath's
    // "End of the Beginning" style collisions before they ever got picked.
    const exactMatch = data.tracks.items.find(t =>
      safeExactMatch(normalize(t.name), normalizedTarget) &&
      artistMatches(t.artists, artist, groupName)
    );

    // Fallback: best candidate that at least passes artist verification,
    // even if the title isn't a perfect normalized match (catches ver./remix naming drift)
    const bestArtistMatch = data.tracks.items.find(t => artistMatches(t.artists, artist, groupName));

    const best = exactMatch || bestArtistMatch;

    if (!best) {
      return { found: false, note: 'results returned but none matched the expected artist' };
    }

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
      const existing = song.links?.spotify;
      if (existing || existing === null) {
        continue;
      }

      const artist = song.artist || groupNames[source.group];
      const result = await searchSpotify(song.title, artist, groupNames[source.group], token);

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