# MMM-AIWallpaper

A [MagicMirror²](https://magicmirror.builders/) module that generates a new AI wallpaper every hour based on the current weather, time of day, and month — using [Pollinations.ai](https://pollinations.ai) and the [OpenWeatherMap API](https://openweathermap.org/api).

![MagicMirror](https://img.shields.io/badge/MagicMirror²-compatible-blue)
![License](https://img.shields.io/badge/license-MIT-green)

---

## Features

- 🌤️ **Weather-aware** — fetches live weather and builds the prompt around current conditions
- 🕐 **Time-of-day aware** — sunrise, morning, midday, sunset, dusk, night
- 📅 **Month-aware** — seasonal modifiers per month (fully customizable)
- 🖼️ **Downloads & caches** the image locally — always stored as `current_wallpaper.jpg`, one file on disk
- 🔁 **Auto-refreshes** every hour (configurable)
- 🐛 **Debug overlay** — on-screen panel + console logs when `debug: true`

---

## Example Prompts Generated

> `golden hour sunrise, dawn, light rain weather, early spring, first flowers, fresh, photorealistic landscape, cinematic, 8k`

> `night, stars, moonlight, clear sky weather, winter, christmas lights, snow, photorealistic landscape, cinematic, 8k`

---

## Requirements

- MagicMirror² installed and running
- A free [OpenWeatherMap API key](https://openweathermap.org/api) (free tier: 1,000 calls/day)
- A free [Pollinations.ai publishable key](https://enter.pollinations.ai) (`pk_...`)

---

## Installation

```bash
cd ~/MagicMirror/modules
git clone https://github.com/YOUR_USERNAME/MMM-AIWallpaper.git
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
    weatherApiKey:   "YOUR_OPENWEATHERMAP_KEY",
    pollinationsKey: "YOUR_POLLINATIONS_KEY",   // pk_...
    city:            "Munich",
    width:           1920,
    height:          1080,
    model:           "flux",
    enhance:         true,
    style:           "photorealistic landscape, cinematic, 8k",
    updateInterval:  60 * 60 * 1000,            // 1 hour in ms
    debug:           false,
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
| `width` | `1920` | Image width in pixels |
| `height` | `1080` | Image height in pixels |
| `model` | `"flux"` | Pollinations model (`flux` or `turbo`) |
| `enhance` | `true` | Let Pollinations auto-enhance the prompt |
| `style` | `"photorealistic landscape, ultra detailed, 8k"` | Base style appended to every prompt |
| `updateInterval` | `3600000` | Refresh interval in ms (default: 1 hour) |
| `debug` | `false` | Show debug overlay and console logs |
| `monthModifiers` | *(see below)* | Per-month prompt modifiers |

---

## Month Modifiers

Each month has a default seasonal modifier. You can override any or all of them in your config:

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
| 09:00 – 11:59 | bright morning, clear daylight |
| 12:00 – 16:59 | midday, full sunlight |
| 17:00 – 19:59 | sunset, golden hour, warm orange sky |
| 20:00 – 22:59 | dusk, twilight, blue hour |
| 23:00 – 04:59 | night, stars, moonlight |

---

## Debug Mode

Set `debug: true` in your config to enable:

- **On-screen overlay** (bottom-left) showing all prompt parameters, status, local file path, and any errors
- **Console logs** for every step: weather fetch, prompt build, image URL, download progress, and file save

```javascript
config: {
  debug: true,
  // ...
}
```

---

## How It Works

1. On startup and every hour, the module fetches the current weather from OpenWeatherMap
2. It combines the weather description, current time-of-day, month modifier, and your style into a prompt
3. The prompt is sent to Pollinations.ai, which generates a unique image
4. `node_helper.js` downloads the image and saves it as `current_wallpaper.jpg` in the module folder (overwriting the previous one)
5. The frontend receives a socket notification and updates the background

The image is always stored under the same filename, so disk usage stays constant at ~1–3 MB.

---

## File Structure

```
MMM-AIWallpaper/
├── MMM-AIWallpaper.js     # Frontend module
├── node_helper.js         # Backend: handles file download
├── MMM-AIWallpaper.css    # Fullscreen background + debug overlay styles
├── current_wallpaper.jpg  # Generated at runtime, not committed
└── README.md
```

---

## License

MIT
