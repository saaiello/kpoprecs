export const GENRE_MAP = {
  "acapella": null,
  "acoustic": "Acoustic",
  "acoustic/lo-fi": "Acoustic",
  "afro-pop": "Afrobeat/Global",
  "afrobeat": "Afrobeat/Global",
  "afro-house": "Afrobeat/Global",
  "aggressive trap": "Hip-Hop",
  "alt-pop": "Pop",
  "alternative": "Rock/Punk/Metal",
  "alternative hip-hop": "Hip-Hop",
  "alternative pop": "Pop",
  "alternative rock": "Rock/Punk/Metal",
  "ambient": "Interlude/Other",
  "ambient acoustic": "Acoustic",
  "ambient ballad": "Ballad",
  "ambient electronic": "Electronic",
  "ambient interlude": "Interlude/Other",
  "anthem": null,
  "anthemic ballad": "Ballad",
  "anthemic marching-band pop": "Pop",
  "anthemic pop": "Pop",
  "arena rock": "Rock/Punk/Metal",
  "ballad": "Ballad",
  "brass pop": "Pop",
  "britpop": "Rock/Punk/Metal",
  "brazilian funk": "Afrobeat/Global",
  "chill electronic": "Electronic",
  "cloud rap": "Hip-Hop",
  "club dance": "House/Club EDM",
  "conscious hip-hop": "Hip-Hop",
  "contemporary pop": "Pop",
  "contemporary r&b": "R&B/Soul",
  "cyberpunk pop": "Dance-Pop",
  "dance pop": "Dance-Pop",
  "dark pop": "Pop",
  "dark synth-pop": "Dance-Pop",
  "dark synth-rock": "Electronic",
  "dark trap": "Hip-Hop",
  "darkwave": "Electronic",
  "deep house": "House/Club EDM",
  "demo": null,
  "disco pop": "Dance-Pop",
  "drum & bass": "House/Club EDM",
  "edm trap": "House/Club EDM",
  "edm/electronic": "House/Club EDM",
  "electronic": "Electronic",
  "electropop": "Dance-Pop",
  "experimental rap": "Hip-Hop",
  "emo-rap": "Hip-Hop",
  "emo-trap": "Hip-Hop",
  "emo rock": "Rock/Punk/Metal",
  "emo punk": "Rock/Punk/Metal",
  "eurodance": "House/Club EDM",
  "experimental": "Interlude/Other",
  "flute trap": "Hip-Hop",
  "funk pop": "R&B/Soul",
  "funk-pop": "R&B/Soul",
  "future bass": "House/Club EDM",
  "future house": "House/Club EDM",
  "gangsta rap": "Hip-Hop",
  "garage rock": "Rock/Punk/Metal",
  "gospel pop": "Pop",
  "gospel sample": null,
  "gothic pop": "Electronic",
  "gqom": "Afrobeat/Global",
  "guitar-pop": "Pop",
  "hardcore hip-hop": "Hip-Hop",
  "hardcore rap": "Hip-Hop",
  "hardcore trap": "Hip-Hop",
  "hip-hop": "Hip-Hop",
  "hip-hop dance":"Dance-Pop",
  "house": "House/Club EDM",
  "hybrid hip-hop": "Hip-Hop",
  "indie pop": "Pop",
  "industrial hip-hop": "Hip-Hop",
  "industrial trap": "Hip-Hop",
  "industrial techno": "House/Club EDM",
  "jazz r&b": "R&B/Soul",
  "jazz-hop": "Hip-Hop",
  "jazz-rap": "Hip-Hop",
  "jazz-pop": "R&B/Soul",
  "kwaito": "Afrobeat/Global",
  "latin-pop": "Afrobeat/Global",
  "latin pop": "Afrobeat/Global",
  "lofi": "Acoustic",
  "melodic rap": "Hip-Hop",
  "moombahton": "House/Club EDM",
  "moombahton trap": "House/Club EDM",
  "neo-soul": "R&B/Soul",
  "nu-disco": "Dance-Pop",
  "nu-metal elements": "Rock/Punk/Metal",
  "old school boom-bap": "Hip-Hop",
  "old school hip-hop": "Hip-Hop",
  "old-school hip-hop": "Hip-Hop",
  "orchestral": "Ballad",
  "orchestral trap": "Hip-Hop",
  "orchestral ballad": "Electronic",
  "other": "Interlude/Other",
  "90s boom bap": "Hip-Hop",
  "90s hip-hop": "Hip-Hop",
  "pop": "Pop",
  "pop ballad": "Ballad",
  "pop rock": "Rock/Punk/Metal",
  "pop-punk": "Rock/Punk/Metal",
  "pop-rock": "Rock/Punk/Metal",
  "progressive house": "House/Club EDM",
  "rap metal": "Rock/Punk/Metal",
  "r&b": "R&B/Soul",
  "r&b pop": "R&B/Soul",
  "r&b/soul": "R&B/Soul",
  "r&b ballad": "Ballad",
  "rap rock": "Rock/Punk/Metal",
  "rap-rock": "Rock/Punk/Metal",
  "reggae": "Afrobeat/Global",
  "reggaeton": "Afrobeat/Global",
  "rock": "Rock/Punk/Metal",
  "rock-ballad": "Ballad",
  "rock ballad": "Ballad",
  "rock/punk/metal": "Rock/Punk/Metal",
  "sensual synth-pop": "Dance-Pop",
  "slow jam": "R&B/Soul",
  "soft rock": "Rock/Punk/Metal",
  "space rock": "Rock/Punk/Metal",
  "spoken word": "Interlude/Other",
  "stadium edm": "House/Club EDM",
  "stadium anthem": "Pop",
  "summer trap": "Hip-Hop",
  "symphonic pop": "Pop",
  "synth-funk": "Dance-Pop",
  "synth-pop": "Dance-Pop",
  "synth-punk": "Rock/Punk/Metal",
  "synthwave": "Electronic",
  "swing pop": "Pop",
  "techno": "House/Club EDM",
  "trap": "Hip-Hop",
  "trap-pop": "Hip-Hop",
  "traditional afro-pop": "Afrobeat/Global",
  "traditional folk": "Acoustic",
  "tropical house": "House/Club EDM",
  "vocal power ballad": "Ballad",
  "vocal slow jam": "R&B/Soul"
};

export const STYLE_TAGS = [
  "aggressive", "chill", "anthem", "driving",
  "dark", "bright", "sensual", "melancholic", "playful", "nostalgic",
  "cinematic", "chant-heavy", "vocal-forward", "dreamy", "gliding", "soft-rap",
  "bouncy", "smooth", "performance-driven", "retro", "glitchy", "futuristic", "atmospheric"
];

// **Energy/Intensity**
// aggressive — hard-edged, confrontational force in vocal delivery and/or beat. Not just fast or loud — has real bite.
// driving — relentless forward momentum, insistent pulse pushing the track along. Can be calm-driving (steady groove) or intense-driving; the defining trait is propulsion, not aggression.
// chill — low-tension, relaxed pace regardless of actual tempo. The opposite pole of aggressive/driving.
// bouncy — light, springy rhythmic bounce. A sub-flavor of upbeat energy, smaller-scale than driving.

// **Mood/Tone**
// dark — moody, minor-key weight, heavier emotional coloring in the production itself (this was your Skin/Checkmate territory).
// bright — light, optimistic sonic palette. Direct opposite of dark (this was your explicit Castle call).
// melancholic — wistful, reflective sadness. Distinct from dark: melancholic is sad/nostalgic in feeling, dark is heavy/moody in texture. A song can be one without the other.
// playful — lighthearted, teasing, fun energy.
// sensual — intimate, restrained, close/breathy quality — slow-burn rather than danceable (your "sensual synth-pop" and Skin's "written on my skin" calls).

// **Structure/Scale**
// anthem — built to swell toward a climactic, sing-along moment. Requires the build, not just a big-sounding hook throughout (this is the exact test we used on Now This House Ain't a Home).
// cinematic — widescreen, scored/orchestral dramatic scale — bigger than anthem, more about scope than climax.
// performance-driven — built around a vocal or choreo showcase moment, live-energy focal point rather than atmosphere or hook.
// chant-heavy — repeated group-vocal hooks, call-and-response structure.

// **Vocal Delivery**
// vocal-forward — vocals sit prominently over/ahead of the instrumentation, the clear focal point of the mix.
// gliding — delivery flows smoothly across the beat rather than locking rhythmically to it. This is your rap-vs-sung disambiguator from Stuck/Now This House — gliding = sung quality, even in a rap verse.
// soft-rap — rhythmically-locked (real rap), but delivered gently/quietly rather than aggressively. The inverse of gliding — still rap, just soft.
// smooth — polished, seamless, no harsh transitions or rough edges anywhere in the track.

// **Texture/Atmosphere**
// atmospheric — heavy use of space, reverb, texture-over-rhythm (your Skin/Now This House Ain't a Home electronic-bed calls).
// dreamy — hazy, floating, soft-focus specifically — a atmospheric sub-flavor, lighter/gauzier than the dark end of atmospheric.
// glitchy — digital stutters, broken/skipping artifacts, intentionally unstable texture.

// **Era/Reference**
// retro — explicitly references a past decade's sonic palette (80s synths, 90s boom-bap) — a texture citation, not a mood.
// nostalgic — evokes reminiscence/longing as a feeling, regardless of whether the production is retro-styled. A brand-new-sounding song can still feel nostalgic.
// futuristic — forward-looking, synthetic, sci-fi digital palette — the opposite pole from retro.