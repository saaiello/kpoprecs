import fs from 'fs';

const RESULTS_FILE = 'spotify-results.json';

// Confirmed wrong matches from the last run -- never merge these, even though
// the script marked them "found: true". Fix these two by hand instead.
const EXCLUDE_TITLES = new Set([
  '걸어가고 있어 (WALKING/WITH U)',  // matched to "WORK" -- wrong song
  'Compass',                          // matched to "Ghost" -- wrong song
]);

function run() {
  const results = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'));

  // group results by which data file they belong to
  const byFile = {};
  for (const r of results) {
    if (!byFile[r.file]) byFile[r.file] = [];
    byFile[r.file].push(r);
  }

  let totalMerged = 0;
  let totalSkippedExcluded = 0;
  let totalSkippedNotFound = 0;
  let totalNoMatchInData = 0;

  for (const [file, fileResults] of Object.entries(byFile)) {
    const songs = JSON.parse(fs.readFileSync(file, 'utf8'));
    let mergedInThisFile = 0;

    for (const r of fileResults) {
      if (EXCLUDE_TITLES.has(r.title)) {
        totalSkippedExcluded++;
        console.log(`  ⛔ SKIPPED (known bad match): ${r.title}`);
        continue;
      }
      if (!r.found || !r.spotifyUrl) {
        totalSkippedNotFound++;
        continue;
      }

      const song = songs.find(s => s.title === r.title);
      if (!song) {
        totalNoMatchInData++;
        console.log(`  ⚠️  Result title not found in ${file}: ${r.title}`);
        continue;
      }

      if (!song.links) song.links = { spotify: '', appleMusic: '', youtube: '' };
      song.links.spotify = r.spotifyUrl;
      mergedInThisFile++;
      totalMerged++;
    }

    fs.writeFileSync(file, JSON.stringify(songs, null, 2), 'utf8');
    console.log(`${file}: merged ${mergedInThisFile} Spotify links`);
  }

  console.log(`\nDone.`);
  console.log(`  Merged: ${totalMerged}`);
  console.log(`  Skipped (known bad matches, needs manual fix): ${totalSkippedExcluded}`);
  console.log(`  Skipped (not found on Spotify): ${totalSkippedNotFound}`);
  console.log(`  Result title didn't match any song in data file: ${totalNoMatchInData}`);
}

run();