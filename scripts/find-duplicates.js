import fs from 'fs';

const songs = JSON.parse(fs.readFileSync('data/bts.json', 'utf8'));
const titlesToCheck = [
  'Danger',
  'BTS Cypher PT.3 : KILLER (Feat. Supreme Boi)',
  'Blood Sweat & Tears'
];

for (const title of titlesToCheck) {
  const matches = songs.filter(s => s.title === title);
  console.log(`\n=== "${title}" — ${matches.length} entries ===`);
  matches.forEach((s, i) => {
    console.log(`\n[${i}] album: ${s.album}, year: ${s.year}, bpm: ${s.bpm}, genres: ${JSON.stringify(s.genres)}, links.spotify: ${s.links.spotify ? '(has link)' : '(empty)'}`);
  });
}