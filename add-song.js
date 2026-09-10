import fs from 'fs';
import readline from 'readline';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (question) => new Promise((resolve) => rl.question(question, resolve));

const VALID_GENRES = [
  'EDM/Electronic', 'Hip-Hop', 'Ballad', 'R&B/Soul',
  'Acoustic/Lo-fi', 'Rock/Punk/Metal', 'Pop'
];

function slugify(album) {
  return album.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function tierFromBpm(bpm) {
  if (bpm == null) return '—';
  if (bpm < 100) return 'Slow';
  if (bpm < 140) return 'Mid';
  return 'Up-tempo';
}

async function run() {
  console.log("Add a new song to songs.json\n(Press Enter to leave any optional field blank)\n");

  const title = await ask('Title: ');
  const album = await ask('Album: ');
  const yearRaw = await ask('Year (blank if none): ');
  const year = yearRaw.trim() ? parseInt(yearRaw.trim(), 10) : null;
  const duration = await ask('Duration (e.g. 3:24): ');

  console.log(`\nValid genres: ${VALID_GENRES.join(', ')}`);
  const genresRaw = await ask('Genres (comma-separated, up to 2): ');
  const genres = genresRaw.split(',').map(g => g.trim()).filter(Boolean);

  const invalidGenres = genres.filter(g => !VALID_GENRES.includes(g));
  if (invalidGenres.length > 0) {
    console.log(`\n⚠️  Warning: these don't match the standard genre list exactly: ${invalidGenres.join(', ')}`);
    console.log('(Continuing anyway — just double-check spelling/capitalization if this was a typo.)\n');
  }

  const bpmRaw = await ask('BPM (blank if unknown): ');
  const bpm = bpmRaw.trim() ? parseInt(bpmRaw.trim(), 10) : null;
  const tier = tierFromBpm(bpm);

  const spotify = await ask('Spotify link (blank if none yet): ');
  const appleMusic = await ask('Apple Music link (blank if none yet): ');
  const youtube = await ask('YouTube link (blank if none yet): ');

  const newSong = {
    title: title.trim(),
    album: album.trim(),
    year,
    duration: duration.trim(),
    genres,
    bpm,
    tier,
    art: `assets/covers/${slugify(album.trim())}.jpg`,
    links: {
      spotify: spotify.trim(),
      appleMusic: appleMusic.trim(),
      youtube: youtube.trim(),
    },
    recs: []
  };

  console.log('\n--- New song entry ---');
  console.log(JSON.stringify(newSong, null, 2));
  const confirm = await ask('\nAdd this to songs.json? (y/n): ');

  if (confirm.trim().toLowerCase() !== 'y') {
    console.log('Cancelled — nothing was saved.');
    rl.close();
    return;
  }

  const songsRaw = fs.readFileSync('data/songs.json', 'utf8');
  const songs = JSON.parse(songsRaw);

  const alreadyExists = songs.some(s => s.title.toLowerCase() === newSong.title.toLowerCase());
  if (alreadyExists) {
    console.log(`\n⚠️  A song titled "${newSong.title}" already exists in songs.json. Not adding a duplicate.`);
    rl.close();
    return;
  }

  songs.push(newSong);
  fs.writeFileSync('data/songs.json', JSON.stringify(songs, null, 2), 'utf8');

  console.log(`\n✓ Added "${newSong.title}" to songs.json. Total songs: ${songs.length}`);
  console.log(`Note: if this is a new album with no cover art yet, add an image at ${newSong.art}`);
  console.log('Remember to git add / commit / push to make it live.');

  rl.close();
}

run();
