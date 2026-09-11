import fs from 'fs';

const RESULTS_FILE = 'spotify-results.json';

function loadResults() {
  return JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'));
}

function mergeIntoFile(filePath, results) {
  const songs = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  let mergedCount = 0;
  let skippedCount = 0;

  for (const result of results) {
    if (!result.found || result.needsReview) {
      skippedCount++;
      continue;
    }

    const matches = songs.filter(s => s.title === result.title);

    if (matches.length === 0) {
      console.log(`  ⚠️  Could not find "${result.title}" in ${filePath} — title may have changed since the search ran`);
      continue;
    }
    if (matches.length > 1) {
      console.log(`  ⚠️  "${result.title}" appears ${matches.length} times in ${filePath} — skipping, merge by hand`);
      continue;
    }

    const song = matches[0];
    if (!song.links) song.links = { spotify: '', appleMusic: '', youtube: '' };
    song.links.spotify = result.spotifyUrl;
    mergedCount++;
  }

  fs.writeFileSync(filePath, JSON.stringify(songs, null, 2), 'utf8');
  return { mergedCount, skippedCount };
}

function run() {
  const allResults = loadResults();
  const byFile = {};

  for (const r of allResults) {
    if (!byFile[r.file]) byFile[r.file] = [];
    byFile[r.file].push(r);
  }

  console.log('Merging confirmed Spotify links...\n');

  let totalMerged = 0;
  let totalSkipped = 0;

  for (const [filePath, results] of Object.entries(byFile)) {
    console.log(`--- ${filePath} ---`);
    const { mergedCount, skippedCount } = mergeIntoFile(filePath, results);
    console.log(`  Merged: ${mergedCount}, skipped (flagged/not found): ${skippedCount}\n`);
    totalMerged += mergedCount;
    totalSkipped += skippedCount;
  }

  console.log(`Done. ${totalMerged} links merged, ${totalSkipped} left untouched for manual review.`);
}

run();