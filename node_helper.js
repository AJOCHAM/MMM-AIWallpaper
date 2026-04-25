const NodeHelper = require("node_helper");
const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");

module.exports = NodeHelper.create({
  start() {
    this.mediaFiles = {
      image: {
        currentPath: path.join(__dirname, "current_wallpaper.jpg"),
        tmpPath: path.join(__dirname, "current_wallpaper.jpg.tmp"),
        defaultPath: path.join(__dirname, "default_wallpaper.jpg"),
        publicPath: "/modules/MMM-AIWallpaper/current_wallpaper.jpg",
        defaultPublicPath: "/modules/MMM-AIWallpaper/default_wallpaper.jpg"
      },
      video: {
        currentPath: path.join(__dirname, "current_wallpaper.mp4"),
        tmpPath: path.join(__dirname, "current_wallpaper.mp4.tmp"),
        defaultPath: path.join(__dirname, "default_wallpaper.mp4"),
        publicPath: "/modules/MMM-AIWallpaper/current_wallpaper.mp4",
        defaultPublicPath: "/modules/MMM-AIWallpaper/default_wallpaper.mp4"
      }
    };

    console.log("[MMM-AIWallpaper] node_helper started.");
    console.log("[MMM-AIWallpaper] Image path:", this.mediaFiles.image.currentPath);
    console.log("[MMM-AIWallpaper] Video path:", this.mediaFiles.video.currentPath);
  },

  socketNotificationReceived(notification, payload) {
    console.log("[MMM-AIWallpaper] node_helper received:", notification);

    if (notification === "DOWNLOAD_MEDIA") {
      const mediaType = payload.mediaType === "video" ? "video" : "image";
      this.downloadMedia(payload.mediaUrl, mediaType, payload.debug, 0);
    }
  },

  localMediaExists(mediaType) {
    return fs.existsSync(this.mediaFiles[mediaType].currentPath);
  },

  buildPublicPath(mediaType, useCurrent) {
    const fileConfig = this.mediaFiles[mediaType];
    if (useCurrent) {
      return `${fileConfig.publicPath}?t=${Date.now()}`;
    }
    return fileConfig.defaultPublicPath;
  },

  sendFallback(reason, mediaType) {
    const usingCurrent = this.localMediaExists(mediaType);
    const fallbackPath = this.buildPublicPath(mediaType, usingCurrent);

    console.warn(`[MMM-AIWallpaper] Falling back to ${usingCurrent ? "last cached" : "default"} ${mediaType}. Reason: ${reason}`);

    this.sendSocketNotification("DOWNLOAD_ERROR", {
      error: reason,
      fallbackPath,
      usingCached: usingCurrent,
      mediaType
    });
  },

  downloadMedia(mediaUrl, mediaType, debug, redirectCount) {
    const MAX_REDIRECTS = 5;
    const fileConfig = this.mediaFiles[mediaType];

    if (redirectCount > MAX_REDIRECTS) {
      this.sendFallback(`Too many redirects (> ${MAX_REDIRECTS})`, mediaType);
      return;
    }

    console.log(`[MMM-AIWallpaper] Downloading ${mediaType} (redirect #${redirectCount}):`, mediaUrl);

    let parsedUrl;
    try {
      parsedUrl = new URL(mediaUrl);
    } catch (e) {
      this.sendFallback(`Invalid URL: ${mediaUrl}`, mediaType);
      return;
    }

    const protocol = parsedUrl.protocol === "https:" ? https : http;
    const file = fs.createWriteStream(fileConfig.tmpPath);
    let settled = false;

    const fail = (reason) => {
      if (settled) return;
      settled = true;
      file.close(() => {
        fs.unlink(fileConfig.tmpPath, () => {});
      });
      this.sendFallback(String(reason), mediaType);
    };

    const request = protocol.get(mediaUrl, (response) => {
      if ([301, 302, 307, 308].includes(response.statusCode)) {
        settled = true;
        file.close(() => fs.unlink(fileConfig.tmpPath, () => {}));
        const location = response.headers.location;
        if (!location) {
          this.sendFallback("Redirect with no Location header", mediaType);
          return;
        }

        console.log("[MMM-AIWallpaper] Redirect →", location);
        this.downloadMedia(location, mediaType, debug, redirectCount + 1);
        return;
      }

      if (response.statusCode === 401) {
        fail("Unauthorized (401) — check your Pollinations API key");
        return;
      }

      if (response.statusCode === 429) {
        fail("Rate limit exceeded (429) — will retry next hour");
        return;
      }

      if (response.statusCode !== 200) {
        fail(`HTTP ${response.statusCode} ${response.statusMessage}`);
        return;
      }

      response.pipe(file);

      file.on("finish", () => {
        if (settled) return;
        file.close(() => {
          fs.rename(fileConfig.tmpPath, fileConfig.currentPath, (renameErr) => {
            if (renameErr) {
              fail(`Failed to save ${mediaType}: ${renameErr.message}`);
              return;
            }

            settled = true;
            const size = (fs.statSync(fileConfig.currentPath).size / 1024).toFixed(1);
            console.log(`[MMM-AIWallpaper] ${mediaType} saved successfully (${size} KB):`, fileConfig.currentPath);

            this.sendSocketNotification("MEDIA_READY", {
              localPath: this.buildPublicPath(mediaType, true),
              mediaType
            });
          });
        });
      });

      file.on("error", fail);
    });

    request.on("error", (err) => {
      fail(`Network error: ${err.message}`);
    });

    request.setTimeout(30000, () => {
      request.destroy();
      fail("Download timed out after 30s");
    });
  }
});
