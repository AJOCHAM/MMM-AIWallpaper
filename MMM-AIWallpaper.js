Module.register("MMM-AIWallpaper", {
  defaults: {
    updateInterval: 60 * 60 * 1000,
    weatherApiKey: "DEIN_OPENWEATHERMAP_KEY",
    city: "Berlin",
    width: 1080,
    height: 1920,
    mediaType: "video",
    imagemodel: "flux",
    videomodel: "nova-reel",
    enhance: true,
    pollinationsKey: "pk_DEIN_KEY_HIER",
    debug: false,
    videoDuration: 5,
    videoAspectRatio: "9:16",
    videoAudio: false,
    muteVideo: true,
    loopVideo: true,
    blur: 0,
    styles: [
      "impressionist painting, oil on canvas, artistic, moody, expressive brushstrokes",
      "Comic style, atmospheric, science fiction elements, modern european",
      "anime background art, studio ghibli style, detailed, beautiful",
      "photorealistic landscape, ultra detailed, 8k"
    ],
    monthModifiers: {
      1: "snowy winter, frozen trees, icy",
      2: "late winter, bare trees, cold light",
      3: "early spring, first flowers, fresh",
      4: "spring, cherry blossoms, green meadows",
      5: "late spring, colorful flowers, warm sun",
      6: "early summer, lush green, golden light",
      7: "midsummer, hot haze, vibrant colors",
      8: "late summer, sunflowers, harvest beginning",
      9: "early autumn, golden leaves, misty mornings",
      10: "autumn, red and orange foliage, fog",
      11: "late autumn, bare trees, grey skies",
      12: "winter, christmas lights, snow"
    }
  },

  getStyles() {
    return ["MMM-AIWallpaper.css"];
  },

  start() {
    this.imageUrl = null;
    this.videoUrl = null;
    this.localPath = null;
    this.localMediaType = this.config.mediaType || "image";
    this.debugInfo = {};
    this.lastUpdated = null;
    this.status = "Initializing...";

    this.log("Module started. Debug mode ON.");
    this.sendSocketNotification("INIT", {});

    this.generateWallpaper();
    setInterval(() => this.generateWallpaper(), this.config.updateInterval);
  },

  socketNotificationReceived(notification, payload) {
    if (notification === "MEDIA_READY") {
      this.localPath = payload.localPath;
      this.localMediaType = payload.mediaType || this.config.mediaType || "image";
      this.status = "OK";
      this.log("Local media ready:", payload);
      this.updateDom();
    }

    if (notification === "DOWNLOAD_ERROR") {
      this.status = `Download error: ${payload.error}`;
      this.debugInfo.error = payload.error;
      this.debugInfo.usingCached = payload.usingCached;
      if (payload.fallbackPath) {
        this.localPath = payload.fallbackPath;
        this.localMediaType = payload.mediaType || this.localMediaType || this.config.mediaType || "image";
      }
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

  getRequestDimensions() {
    const FREE_TIER_MAX_EDGE = 1024;
    const screenW = window.innerWidth || this.config.width;
    const screenH = window.innerHeight || this.config.height;
    const ratio = screenW / screenH;

    let width;
    let height;
    if (screenW >= screenH) {
      width = Math.min(screenW, FREE_TIER_MAX_EDGE);
      height = Math.round(width / ratio);
    } else {
      height = Math.min(screenH, FREE_TIER_MAX_EDGE);
      width = Math.round(height * ratio);
    }

    return { width, height };
  },

  getDaytime() {
    const h = new Date().getHours();
    if (h >= 5 && h < 9) return "golden hour sunrise, dawn";
    if (h >= 9 && h < 12) return "bright morning";
    if (h >= 12 && h < 17) return "midday";
    if (h >= 17 && h < 20) return "sunset, golden hour";
    if (h >= 20 && h < 21) return "dusk, twilight, blue hour";
    return "night, stars, moonlight";
  },

  async generateWallpaper() {
    this.status = "Fetching weather...";
    this.updateDom();
    this.log("Starting wallpaper generation cycle.");

    try {
      const weatherUrl = `https://api.openweathermap.org/data/2.5/weather`
        + `?q=${this.config.city}`
        + `&appid=${this.config.weatherApiKey}`
        + `&units=metric&lang=en`;

      this.log("Fetching weather from:", weatherUrl);
      const res = await fetch(weatherUrl);
      if (!res.ok) throw new Error(`Weather API error: ${res.status} ${res.statusText}`);
      const data = await res.json();

      const weather = data.weather[0].description;
      const temp = data.main.temp;
      const humidity = data.main.humidity;
      const city = data.name;

      this.log("Weather data received:", { weather, temp, humidity, city });

      const month = new Date().getMonth() + 1;
      const monthMod = this.config.monthModifiers[month];
      const randomstyle = this.config.styles[Math.floor(Math.random() * this.config.styles.length)];
      const daytime = this.getDaytime();
      const promptRaw = `Main subject is the weather: ${weather}. Time of day: ${daytime}. Image style must be: ${randomstyle}, Secondary mood and seasonal context: ${monthMod}. The environment may be historical or futuristic, but it must support the weather and style and stay secondary.`;
      const prompt = encodeURIComponent(promptRaw);
      const seed = Math.floor(Math.random() * 2147483647);
      const isVideo = this.config.mediaType === "video";
      const { width, height } = this.getRequestDimensions();

      this.log("Full prompt (raw):", promptRaw);
      this.log("Requesting image sized to match screen (avoids cropping):", { width, height });


      let mediaUrl = "";

      if (isVideo) {
        mediaUrl = `https://gen.pollinations.ai/video/${prompt}`
          + `?model=${encodeURIComponent(this.config.videomodel)}`
          + `&enhance=${this.config.enhance}`
          + `&nologo=true`
          + `&seed=${seed}`
          + `&key=${encodeURIComponent(this.config.pollinationsKey)}`
          + `&duration=${encodeURIComponent(this.config.videoDuration)}`
          + `&aspectRatio=${encodeURIComponent(this.config.videoAspectRatio)}`
          + `&audio=${encodeURIComponent(this.config.videoAudio)}`;
      } else {
        // Free, unauthenticated Flux image generation (no pollinationsKey needed).
        mediaUrl = `https://image.pollinations.ai/prompt/${prompt}`
          + `?model=${encodeURIComponent(this.config.imagemodel)}`
          + `&enhance=${this.config.enhance}`
          + `&nologo=true`
          + `&seed=${seed}`
          + `&width=${width}`
          + `&height=${height}`;
      }

      this.imageUrl = isVideo ? null : mediaUrl;
      this.videoUrl = isVideo ? mediaUrl : null;
      this.status = isVideo ? "Downloading video..." : "Downloading image...";

      this.debugInfo = {
        city,
        weather,
        temp: `${temp}°C`,
        humidity: `${humidity}%`,
        daytime,
        month,
        monthMod,
        prompt: promptRaw,
        imagemodel: this.config.imagemodel,
        videomodel: this.config.videomodel,
        mediaType: this.config.mediaType,
        requestedSize: `${width}x${height}`,
        seed,
        mediaUrl,
        lastUpdated: new Date().toLocaleTimeString()
      };

      this.updateDom();
      this.log("Sending download request to node_helper.", mediaUrl);

      this.sendSocketNotification("DOWNLOAD_MEDIA", {
        mediaUrl,
        mediaType: this.config.mediaType,
        debug: this.config.debug
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
    const bg = document.createElement("div");
    bg.className = "wallpaper-container";

    const blur = Number(this.config.blur) || 0;

    if (this.localPath) {
      if (this.localMediaType === "video") {
        const video = document.createElement("video");
        video.className = "wallpaper-video";
        video.autoplay = true;
        video.muted = this.config.muteVideo !== false;
        video.loop = this.config.loopVideo !== false;
        video.playsInline = true;
        video.src = this.localPath;
        if (blur > 0) {
          video.style.filter = `blur(${blur}px)`;
          video.style.transform = "scale(1.1)";
        }
        bg.appendChild(video);
      } else {
        bg.style.setProperty("background-image", "url('" + this.localPath + "')");
        if (blur > 0) {
          bg.style.filter = `blur(${blur}px)`;
          bg.style.transform = "scale(1.1)";
        }
      }
    }

    wrapper.appendChild(bg);

    if (this.config.debug) {
      const overlay = document.createElement("div");
      overlay.className = "wallpaper-debug-overlay";
      const info = this.debugInfo;
      const isError = this.status.startsWith("ERROR") || this.status.startsWith("Download error");

      const rows = [
        ["Status", this.status],
        ["Media type", this.localMediaType || info.mediaType || "—"],
        ["Local file", this.localPath || "—"],
        ["City", info.city || "—"],
        ["Weather", info.weather || "—"],
        ["Temperature", info.temp || "—"],
        ["Humidity", info.humidity || "—"],
        ["Daytime", info.daytime || "—"],
        ["Month", info.month || "—"],
        ["MonthMod", info.monthMod || "—"],
        ["ImageModel", info.imagemodel || "—"],
        ["VideoModel", info.videomodel || "—"],
        ["Requested size", info.requestedSize || "—"],
        ["Seed", info.seed || "—"],
        ["Updated", info.lastUpdated || "—"],
        ["Prompt", info.prompt || "—"]
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
  }
});
