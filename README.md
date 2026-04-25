# MMM-AIWallpaper

A [MagicMirror²](https://magicmirror.builders/) module that generates a new AI wallpaper or video every hour based on the current weather, time of day, and month — using [Pollinations.ai](https://pollinations.ai) and the [OpenWeatherMap API](https://openweathermap.org/api).

![MagicMirror](https://img.shields.io/badge/MagicMirror²-compatible-blue)
![License](https://img.shields.io/badge/license-MIT-green)

---

## Features

- 🌤️ **Weather-aware** — fetches live weather and builds the prompt around current conditions
- 🕐 **Time-of-day aware** — sunrise, morning, midday, sunset, dusk, night
- 📅 **Month-aware** — seasonal modifiers per month (fully customizable)
- 🎨 **Random style per cycle** — picks a random style from your `styles` array each time
- 🖼️ **Image or video** — supports both static AI images and short AI-generated videos (`mediaType`)
- 💾 **Downloads & caches** locally — always stored as `current_wallpaper.jpg` / `current_wallpaper.mp4`, one file on disk
- 🔁 **Auto-refreshes** every hour (configurable)
- 🐛 **Debug overlay** — on-screen panel + console logs when `debug: true`

---

## Example Prompts Generated

> `Main subject is the weather: light rain. Time of day: golden hour sunrise, dawn. Image style must be: photorealistic landscape, ultra detailed, 8k. Secondary mood and seasonal context: early spring, first flowers, fresh.`

> `Main subject is the weather: clear sky. Time of day: night, stars, moonlight. Image style must be: anime background art, studio ghibli style, detailed, beautiful. Secondary mood and seasonal context: winter, christmas lights, snow.`

---

## Requirements

- MagicMirror² installed and running
- A free [OpenWeatherMap API key](https://openweathermap.org/api) (free tier: 1,000 calls/day)
- A free [Pollinations.ai publishable key](https://enter.pollinations.ai) (`pk_...`)

---

## Installation

```bash
cd ~/MagicMirror/modules
git clone https://github.com/AJOCHAM/MMM-AIWallpaper.git
cd MMM-AIWallpaper
```

No `npm install` needed — only built-in Node.js modules are used.

---

## Configuration

Add to your `~/MagicMirror/config/config.js`:

```javascript
{
  module: "MMM-AIWallpaper",
  position: "fullscreen_below",
  config: {
    weatherApiKey:    "YOUR_OPENWEATHERMAP_KEY",
    pollinationsKey:  "YOUR_POLLINATIONS_KEY",   // pk_...
    city:             "Munich",
    mediaType:        "image",                   // "image" or "video"
    width:            1920,
    height:           1080,
    imagemodel:       "flux",
    videomodel:       "nova-reel",
    videoDuration:    5,
    videoAspectRatio: "9:16",
    videoAudio:       false,
    muteVideo:        true,
    loopVideo:        true,
    enhance:          true,
    styles: [
      "impressionist painting, oil on canvas, artistic, moody, expressive brushstrokes",
      "Comic style, atmospheric, science fiction elements, modern european",
      "anime background art, studio ghibli style, detailed, beautiful",
      "photorealistic landscape, ultra detailed, 8k"
    ],
    updateInterval:   60 * 60 * 1000,            // 1 hour in ms
    debug:            false,
  }
},
```

---

## Configuration Options

| Option | Default | Description |
|---|---|---|
| `weatherApiKey` | `""` | OpenWeatherMap API key (required) |
| `pollinationsKey` | `""` | Pollinations.ai publishable key `pk_...` (required) |
| `city` | `"Berlin"` | City for weather lookup |
| `mediaType` | `"video"` | Output type: `"image"` or `"video"` |
| `width` | `1080` | Image width in pixels (image mode only) |
| `height` | `1920` | Image height in pixels (image mode only) |
| `imagemodel` | `"flux"` | Pollinations image model (e.g. `flux`, `turbo`) |
| `videomodel` | `"nova-reel"` | Pollinations video model |
| `videoDuration` | `5` | Video duration in seconds |
| `videoAspectRatio` | `"9:16"` | Video aspect ratio (e.g. `"16:9"`, `"9:16"`) |
| `videoAudio` | `false` | Include audio in generated video |
| `muteVideo` | `true` | Mute video playback in the browser |
| `loopVideo` | `true` | Loop video playback |
| `enhance` | `true` | Let Pollinations auto-enhance the prompt |
| `styles` | *(see below)* | Array of styles; one is picked at random each cycle |
| `updateInterval` | `3600000` | Refresh interval in ms (default: 1 hour) |
| `debug` | `false` | Show debug overlay and console logs |
| `monthModifiers` | *(see below)* | Per-month prompt modifiers |

---

## Styles

Each generation cycle picks one style at random from the `styles` array. You can add as many as you like:

```javascript
styles: [
  "impressionist painting, oil on canvas, artistic, moody, expressive brushstrokes",
  "Comic style, atmospheric, science fiction elements, modern european",
  "anime background art, studio ghibli style, detailed, beautiful",
  "photorealistic landscape, ultra detailed, 8k"
],
```

---

## Month Modifiers

Each month has a default seasonal modifier applied as secondary context to the prompt. You can override any or all of them in your config:

```javascript
monthModifiers: {
  1:  "snowy winter, frozen trees, icy",
  2:  "late winter, bare trees, cold light",
  3:  "early spring, first flowers, fresh",
  4:  "spring, cherry blossoms, green meadows",
  5:  "late spring, colorful flowers, warm sun",
  6:  "early summer, lush green, golden light",
  7:  "midsummer, hot haze, vibrant colors",
  8:  "late summer, sunflowers, harvest beginning",
  9:  "early autumn, golden leaves, misty mornings",
  10: "autumn, red and orange foliage, fog",
  11: "late autumn, bare trees, grey skies",
  12: "winter, christmas lights, snow",
},
```

You can customize these freely — add specific locations, art styles, moods, or seasonal events:

```javascript
monthModifiers: {
  10: "Halloween, jack-o-lanterns, spooky fog, orange glow",
  12: "Christmas Eve, snow, warm window light, cozy village",
}
```

---

## Time of Day

The module automatically selects a time-of-day descriptor based on the current hour:

| Hour | Descriptor |
|---|---|
| 05:00 – 08:59 | golden hour sunrise, dawn |
| 09:00 – 11:59 | bright morning |
| 12:00 – 16:59 | midday |
| 17:00 – 19:59 | sunset, golden hour |
| 20:00 – 20:59 | dusk, twilight, blue hour |
| 21:00 – 04:59 | night, stars, moonlight |

---

## Debug Mode

Set `debug: true` in your config to enable:

- **On-screen overlay** showing: status, media type, local file path, city, weather, temperature, humidity, daytime, month modifier, model names, seed, last updated time, full prompt, and any errors
- **Console logs** for every step: weather fetch, prompt build, media URL, download progress, and file save

```javascript
config: {
  debug: true,
  // ...
}
```

---

## How It Works

1. On startup and every hour, the module fetches the current weather from OpenWeatherMap
2. It picks a random style from the `styles` array, then combines it with the weather description, current time-of-day, and month modifier to build a prompt
3. The prompt is sent to Pollinations.ai, which generates a unique image or video
4. `node_helper.js` downloads the media and saves it locally (overwriting the previous file)
5. The frontend receives a socket notification and updates the background

Disk usage stays constant at ~1–3 MB for images, or more for video depending on duration.

---

## File Structure

```
MMM-AIWallpaper/
├── MMM-AIWallpaper.js       # Frontend module
├── node_helper.js           # Backend: handles file download
├── MMM-AIWallpaper.css      # Fullscreen background + debug overlay styles
├── current_wallpaper.jpg    # Generated at runtime (image mode), not committed
├── current_wallpaper.mp4    # Generated at runtime (video mode), not committed
└── README.md
```

---

## License

MIT