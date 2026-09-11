import fs from 'fs';

const GENRE_MAP = {
  "acoustic": "Acoustic/Lo-fi",
  "acoustic/lo-fi": "Acoustic/Lo-fi",
  "afro-pop": "Afrobeat/Global",
  "aggressive trap": "Hip-Hop",
  "alt-pop": "Pop",
  "alternative": "Rock/Punk/Metal",
  "alternative pop": "Pop",
  "ambient": "Interlude/Other",
  "ambient acoustic": "Acoustic/Lo-fi",
  "ambient electronic": "Electronic/Atmospheric",
  "ambient interlude": "Interlude/Other",
  "anthem": null,
  "anthemic ballad": "Ballad",
  "anthemic marching-band pop": "Pop",
  "anthemic pop": "Pop",
  "arena rock": "Rock/Punk/Metal",
  "ballad": "Ballad",
  "britpop": "Rock/Punk/Metal",
  "cloud rap": "Hip-Hop",
  "club dance": "House/Club EDM",
  "contemporary pop": "Pop",
  "contemporary r&b": "R&B/Soul",
  "dance-pop": "Dance-Pop",
  "dark pop": "Pop",
  "dark trap": "Hip-Hop",
  "darkwave": "Electronic/Atmospheric",
  "drum & bass": "House/Club EDM",
  "edm/electronic": "House/Club EDM",
  "electronic": "Electronic/Atmospheric",
  "electropop": "Dance-Pop",
  "emo-rap": "Hip-Hop",
  "emo-trap": "Hip-Hop",
  "experimental": "Interlude/Other",
  "funk-pop": "R&B/Soul",
  "future bass": "House/Club EDM",
  "future house": "House/Club EDM",
  "garage rock": "Rock/Punk/Metal",
  "gqom": "Afrobeat/Global",
  "guitar-pop": "Pop",
  "hardcore rap": "Hip-Hop",
  "hardcore trap": "Hip-Hop",
  "hip-hop": "Hip-Hop",
  "house": "House/Club EDM",
  "industrial hip-hop": "Hip-Hop",
  "jazz-hop": "Hip-Hop",
  "jazz-rap": "Hip-Hop",
  "kwaito": "Afrobeat/Global",
  "latin-pop": "Pop",
  "lofi": "Acoustic/Lo-fi",
  "melodic rap": "Hip-Hop",
  "moombahton trap": "House/Club EDM",
  "neo-soul": "R&B/Soul",
  "nu-metal elements": "Rock/Punk/Metal",
  "old school boom-bap": "Hip-Hop",
  "orchestral": "Ballad",
  "orchestral trap": "Hip-Hop",
  "other": "Interlude/Other",
  "pop": "Pop",
  "pop-punk": "Rock/Punk/Metal",
  "pop-rock": "Rock/Punk/Metal",
  "progressive house": "House/Club EDM",
  "eurodance": "House/Club EDM",
  "r&b/soul": "R&B/Soul",
  "rap rock": "Rock/Punk/Metal",
  "rap-rock": "Rock/Punk/Metal",
  "rock/punk/metal": "Rock/Punk/Metal",
  "sensual synth-pop": "Dance-Pop",
  "slow jam": "R&B/Soul",
  "space rock": "Rock/Punk/Metal",
  "spoken word": "Interlude/Other",
  "stadium edm": "House/Club EDM",
  "summer trap": "Hip-Hop",
  "synth-pop": "Dance-Pop",
  "synth-punk": "Rock/Punk/Metal",
  "trap": "Hip-Hop",
  "trap-pop": "Hip-Hop",
  "traditional afro-pop": "Afrobeat/Global",
  "traditional folk": "Acoustic/Lo-fi",
  "tropical house": "House/Club EDM",
  "vocal power ballad": "Ballad",
  "vocal slow jam": "R&B/Soul"
};

const FILES = ['data/songs.json', 'data/bts.json', 'data/ateez.json'];

const gaps = {}; // tag -> [{ file, title }]

for (const file of FILES) {
  const songs = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const song of songs) {
    for (const tag of song.genres || []) {
      const key = tag.toLowerCase();
      if (!(key in GENRE_MAP)) {
        if (!gaps[tag]) gaps[tag] = [];
        gaps[tag].push({ file, title: song.title });
      }
    }
  }
}

const sortedTags = Object.keys(gaps).sort();

console.log(`Found ${sortedTags.length} unmapped tags:\n`);
for (const tag of sortedTags) {
  const examples = gaps[tag].slice(0, 3).map(e => `${e.title} (${e.file})`).join(', ');
  const more = gaps[tag].length > 3 ? ` +${gaps[tag].length - 3} more` : '';
  console.log(`"${tag}" — ${gaps[tag].length} song(s): ${examples}${more}`);
}

fs.writeFileSync('genre-gaps.json', JSON.stringify(gaps, null, 2));
console.log('\nFull details saved to genre-gaps.json');