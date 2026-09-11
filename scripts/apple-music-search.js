import fs from 'fs';

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

async function searchAppleMusic(title, artist) {
  const term = encodeURIComponent(`${artist} ${title}`);
  const url = `https://itunes.apple.com/search?term=${term}&entity=song&limit=5`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (!data.results || data.results.length === 0) {
      return { found: false };
    }

    const normalizedTarget = normalize(title);
    const exactMatch = data.results.find(r => normalize(r.trackName) === normalizedTarget);
    const best = exactMatch || data.results[0];

    return {
      found: true,
      matchedTrackName: best.trackName,
      matchedArtist: best.artistName,
      appleMusicUrl: best.trackViewUrl,
      needsReview: !exactMatch
    };
  } catch (err) {
    return { found: false, error: err.message };
  }
}

async function run() {
  const allResults = [];

  for (const source of DATA_FILES) {
    const songs = JSON.parse(fs.readFileSync(source.file, 'utf8'));
    console.log(`\n--- ${source.file} (${songs.length} songs) ---\n`);

    for (const song of songs) {
      const existing = song.links?.appleMusic;
      if (existing || existing === null) {
        continue; // has a real link already, or confirmed no link exists
      }

      const artist = song.artist || groupNames[source.group];
      const result = await searchAppleMusic(song.title, artist);
      // ...rest of the loop stays the same

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

      fs.writeFileSync('applemusic-results.json', JSON.stringify(allResults, null, 2));

      await new Promise(r => setTimeout(r, 2000));
    }
  }

  const notFound = allResults.filter(r => !r.found).length;
  const needsReview = allResults.filter(r => r.needsReview).length;
  console.log(`\nDone. ${notFound} not found, ${needsReview} matched but flagged for review.`);
  console.log('Saved to applemusic-results.json — review flagged entries before merging into your data files.');
}

run();