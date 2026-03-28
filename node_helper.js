const NodeHelper = require("node_helper");
const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");

module.exports = NodeHelper.create({

  start() {
    this.imagePath = path.join(__dirname, "current_wallpaper.jpg");
    this.tmpPath   = this.imagePath + ".tmp";
    console.log("[MMM-AIWallpaper] node_helper started. Image path:", this.imagePath);
  },

  socketNotificationReceived(notification, payload) {
    console.log("[MMM-AIWallpaper] node_helper received:", notification);
    if (notification === "DOWNLOAD_IMAGE") {
      this.downloadImage(payload.imageUrl, payload.debug);
    }
  },

  downloadImage(imageUrl, debug) {
    console.log("[MMM-AIWallpaper] Downloading:", imageUrl);

    const parsedUrl  = url.parse(imageUrl);
    const protocol   = parsedUrl.protocol === "https:" ? https : http;
    const file       = fs.createWriteStream(this.tmpPath);
    let   settled    = false;

    const fail = (reason) => {
      if (settled) return;
      settled = true;
      file.close(() => fs.unlink(this.tmpPath, () => {}));
      console.error("[MMM-AIWallpaper] Download failed:", reason);
      this.sendSocketNotification("DOWNLOAD_ERROR", { error: String(reason) });
    };

    const request = protocol.get(imageUrl, (response) => {

      // Follow redirects (301 / 302)
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close(() => fs.unlink(this.tmpPath, () => {}));
        const location = response.headers.location;
        console.log("[MMM-AIWallpaper] Redirect →", location);
        this.downloadImage(location, debug);
        return;
      }

      if (response.statusCode !== 200) {
        fail(`HTTP ${response.statusCode} ${response.statusMessage}`);
        return;
      }

      response.pipe(file);

      file.on("finish", () => {
        file.close(() => {
          fs.rename(this.tmpPath, this.imagePath, (err) => {
            if (err) { fail(err.message); return; }

            const size = (fs.statSync(this.imagePath).size / 1024).toFixed(1);
            console.log(`[MMM-AIWallpaper] Image saved (${size} KB):`, this.imagePath);

            this.sendSocketNotification("IMAGE_READY", {
              localPath: `/modules/MMM-AIWallpaper/current_wallpaper.jpg?t=${Date.now()}`,
            });
          });
        });
      });

      file.on("error", fail);
    });

    request.on("error", fail);

    request.setTimeout(30000, () => {
      request.destroy();
      fail("Timeout after 30s");
    });
  },

});