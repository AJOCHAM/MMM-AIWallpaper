Module.register("MMM-AIWallpaper", {
  defaults: {
    updateInterval: 60 * 60 * 1000,
    weatherApiKey: "DEIN_OPENWEATHERMAP_KEY",
    city: "Berlin",
    width: 1920,
    height: 1080,
    model: "flux",
    enhance: true,
    style: "photorealistic landscape, ultra detailed, 8k",
    pollinationsKey: "pk_DEIN_KEY_HIER",
    debug: false,
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
  },

  getStyles() {
    return ["MMM-AIWallpaper.css"];
  },

  start() {
    this.imageUrl = null;      // remote URL (for debug display)
    this.localPath = null;     // local file path served by MM
    this.debugInfo = {};
    this.lastUpdated = null;
    this.status = "Initializing...";

    this.log("Module started. Debug mode ON.");

    // Listen for messages from node_helper
    this.sendSocketNotification("INIT", {});

    this.generateWallpaper();
    setInterval(() => this.generateWallpaper(), this.config.updateInterval);
  },

  socketNotificationReceived(notification, payload) {
    if (notification === "IMAGE_READY") {
      this.localPath = payload.localPath;
      this.status = "OK";
      this.log("Local image ready:", payload.localPath);
      this.updateDom();
    }

    if (notification === "DOWNLOAD_ERROR") {
      this.status = `Download error: ${payload.error}`;
      this.debugInfo.error = payload.error;
      console.error("[MMM-AIWallpaper] Download error:", payload.error);
      this.updateDom();
    }
  },

  log(message, data = null) {
    if (!this.config.debug) return;
    const prefix = "[MMM-AIWallpaper]";
    if (data) {
      console.log(`${prefix} ${message}`, data);
    } else {
      console.log(`${prefix} ${message}`);
    }
  },

  getDaytime() {
    const h = new Date().getHours();
    if (h >= 5  && h < 9)  return "golden hour sunrise, dawn";
    if (h >= 9  && h < 12) return "bright morning, clear daylight";
    if (h >= 12 && h < 17) return "midday, full sunlight";
    if (h >= 17 && h < 20) return "sunset, golden hour, warm orange sky";
    if (h >= 20 && h < 23) return "dusk, twilight, blue hour";
    return "night, stars, moonlight";
  },

  async generateWallpaper() {
    this.status = "Fetching weather...";
    this.updateDom();
    this.log("Starting wallpaper generation cycle.");

    try {
      // --- Step 1: Weather ---
      const weatherUrl = `https://api.openweathermap.org/data/2.5/weather`
        + `?q=${this.config.city}`
        + `&appid=${this.config.weatherApiKey}`
        + `&units=metric&lang=en`;

      this.log("Fetching weather from:", weatherUrl);
      const res = await fetch(weatherUrl);
      if (!res.ok) throw new Error(`Weather API error: ${res.status} ${res.statusText}`);
      const data = await res.json();

      const weather  = data.weather[0].description;
      const temp     = data.main.temp;
      const humidity = data.main.humidity;
      const city     = data.name;

      this.log("Weather data received:", { weather, temp, humidity, city });

      // --- Step 2: Build prompt ---
      const month    = new Date().getMonth() + 1;
      const monthMod = this.config.monthModifiers[month];
      const daytime  = this.getDaytime();
      const promptRaw = `${daytime}, ${weather} weather, ${monthMod}, ${this.config.style}`;
      const prompt   = encodeURIComponent(promptRaw);
      const seed     = Math.floor(Math.random() * 2147483647);

      this.log("Full prompt (raw):", promptRaw);

      // --- Step 3: Build image URL ---
      const imgUrl = `https://gen.pollinations.ai/image/${prompt}`
        + `?width=${this.config.width}`
        + `&height=${this.config.height}`
        + `&model=${this.config.model}`
        + `&enhance=${this.config.enhance}`
        + `&nologo=true`
        + `&seed=${seed}`
        + `&key=${this.config.pollinationsKey}`;

      this.imageUrl = imgUrl;
      this.status   = "Downloading image...";

      this.debugInfo = {
        city,
        weather,
        temp:        `${temp}°C`,
        humidity:    `${humidity}%`,
        daytime,
        month,
        monthMod,
        prompt:      promptRaw,
        model:       this.config.model,
        seed,
        imageUrl:    imgUrl,
        lastUpdated: new Date().toLocaleTimeString(),
      };

      this.updateDom();
      this.log("Sending download request to node_helper.", imgUrl);

      // --- Step 4: Hand off download to node_helper ---
      this.sendSocketNotification("DOWNLOAD_IMAGE", {
        imageUrl: imgUrl,
        debug: this.config.debug,
      });

    } catch (e) {
      this.status = `ERROR: ${e.message}`;
      this.debugInfo.error = e.message;
      console.error("[MMM-AIWallpaper] Generation failed:", e);
      this.updateDom();
    }
  },

  getDom() {
    const wrapper = document.createElement("div");

    // Background — use local file once available, else nothing
    const bg = document.createElement("div");
    bg.className = "wallpaper-container";

    if (this.localPath) {
        bg.style.setProperty("background-image", "url('" + this.localPath + "')");
    }
    wrapper.appendChild(bg);

    // Debug overlay
    if (this.config.debug) {
      const overlay = document.createElement("div");
      overlay.className = "wallpaper-debug-overlay";
      const info    = this.debugInfo;
      const isError = this.status.startsWith("ERROR") || this.status.startsWith("Download error");

      const rows = [
        ["Status",      this.status],
        ["Local file",  this.localPath  || "—"],
        ["City",        info.city       || "—"],
        ["Weather",     info.weather    || "—"],
        ["Temperature", info.temp       || "—"],
        ["Humidity",    info.humidity   || "—"],
        ["Daytime",     info.daytime    || "—"],
        ["Month",       info.month      || "—"],
        ["MonthMod",    info.monthMod   || "—"],
        ["Model",       info.model      || "—"],
        ["Seed",        info.seed       || "—"],
        ["Updated",     info.lastUpdated|| "—"],
        ["Prompt",      info.prompt     || "—"],
      ];

      if (info.error) rows.push(["Error", info.error]);

      overlay.innerHTML = `
        <div class="wdb-title">MMM-AIWallpaper Debug</div>
        <table class="wdb-table">
          ${rows.map(([k, v]) => `
            <tr>
              <td class="wdb-key">${k}</td>
              <td class="wdb-val ${k === "Status" && isError ? "wdb-error" : ""}">${v}</td>
            </tr>
          `).join("")}
        </table>
      `;
      wrapper.appendChild(overlay);
    }

    return wrapper;
  },
});