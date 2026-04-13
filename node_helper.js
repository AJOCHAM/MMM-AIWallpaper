const NodeHelper = require("node_helper");
const https      = require("https");
const http       = require("http");
const fs         = require("fs");
const path       = require("path");
const url        = require("url");

module.exports = NodeHelper.create({

  start() {
    this.imagePath   = path.join(__dirname, "current_wallpaper.jpg");
    this.tmpPath     = path.join(__dirname, "current_wallpaper.jpg.tmp");
    this.defaultPath = path.join(__dirname, "default_wallpaper.jpg");
    console.log("[MMM-AIWallpaper] node_helper started.");
    console.log("[MMM-AIWallpaper] Image path:   ", this.imagePath);
    console.log("[MMM-AIWallpaper] Default path: ", this.defaultPath);
  },

  socketNotificationReceived(notification, payload) {
    console.log("[MMM-AIWallpaper] node_helper received:", notification);
    if (notification === "DOWNLOAD_IMAGE") {
      this.downloadImage(payload.imageUrl, payload.debug, 0);
    }
  },

  // ── Helpers ──────────────────────────────────────────────────────────────

  localImageExists() {
    return fs.existsSync(this.imagePath);
  },

  sendFallback(reason) {
    const usingCurrent = this.localImageExists();
    const fallbackPath = usingCurrent
      ? `/modules/MMM-AIWallpaper/current_wallpaper.jpg?t=${Date.now()}`
      : `/modules/MMM-AIWallpaper/default_wallpaper.jpg`;

    console.warn(`[MMM-AIWallpaper] Falling back to ${usingCurrent ? "last cached" : "default"} wallpaper. Reason: ${reason}`);

    this.sendSocketNotification("DOWNLOAD_ERROR", {
      error:        reason,
      fallbackPath: fallbackPath,
      usingCached:  usingCurrent,
    });
  },

  // ── Download (with redirect following) ───────────────────────────────────

  downloadImage(imageUrl, debug, redirectCount) {
    const MAX_REDIRECTS = 5;

    if (redirectCount > MAX_REDIRECTS) {
      this.sendFallback(`Too many redirects (> ${MAX_REDIRECTS})`);
      return;
    }

    console.log(`[MMM-AIWallpaper] Downloading (redirect #${redirectCount}):`, imageUrl);

    let parsedUrl;
    try {
      parsedUrl = new URL(imageUrl);
    } catch (e) {
      this.sendFallback(`Invalid URL: ${imageUrl}`);
      return;
    }

    const protocol = parsedUrl.protocol === "https:" ? https : http;
    const file     = fs.createWriteStream(this.tmpPath);
    let   settled  = false;

    const fail = (reason) => {
      if (settled) return;
      settled = true;
      file.close(() => {
        fs.unlink(this.tmpPath, () => {});
      });
      this.sendFallback(String(reason));
    };

    const request = protocol.get(imageUrl, (response) => {

      // ── Redirects ──
      if ([301, 302, 307, 308].includes(response.statusCode)) {
        settled = true;
        file.close(() => fs.unlink(this.tmpPath, () => {}));
        const location = response.headers.location;
        if (!location) {
          this.sendFallback("Redirect with no Location header");
          return;
        }
        console.log("[MMM-AIWallpaper] Redirect →", location);
        this.downloadImage(location, debug, redirectCount + 1);
        return;
      }

      // ── Auth / rate limit ──
      if (response.statusCode === 401) {
        fail("Unauthorized (401) — check your Pollinations API key");
        return;
      }
      if (response.statusCode === 429) {
        fail("Rate limit exceeded (429) — will retry next hour");
        return;
      }

      // ── Any other non-200 ──
      if (response.statusCode !== 200) {
        fail(`HTTP ${response.statusCode} ${response.statusMessage}`);
        return;
      }

      // ── Stream to tmp file ──
      response.pipe(file);

      file.on("finish", () => {
        if (settled) return;
        file.close(() => {
          fs.rename(this.tmpPath, this.imagePath, (renameErr) => {
            if (renameErr) {
              fail(`Failed to save image: ${renameErr.message}`);
              return;
            }
            settled = true;
            const size = (fs.statSync(this.imagePath).size / 1024).toFixed(1);
            console.log(`[MMM-AIWallpaper] Image saved successfully (${size} KB):`, this.imagePath);

            this.sendSocketNotification("IMAGE_READY", {
              localPath: `/modules/MMM-AIWallpaper/current_wallpaper.jpg?t=${Date.now()}`,
            });
          });
        });
      });

      file.on("error", fail);
    });

    // ── Network error ──
    request.on("error", (err) => {
      fail(`Network error: ${err.message}`);
    });

    // ── Timeout ──
    request.setTimeout(30000, () => {
      request.destroy();
      fail("Download timed out after 30s");
    });
  },

});