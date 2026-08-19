import { Router } from "express";
import { getBotStatus } from "../config/db.js";

const router = Router();

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  seconds %= 86400;

  const hours = Math.floor(seconds / 3600);
  seconds %= 3600;

  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);

  return `${days}d ${hours}h ${minutes}m ${secs}s`;
}

router.get("/", async (req, res) => {
  try {
    const botStatus = await getBotStatus();
    const client = req.app.locals.client;

    const online = client?.isReady?.() === true;
    const ping = client?.ws?.ping ?? "N/A";
    const uptime = formatUptime(process.uptime());

    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Status Page</title>

          <style>
            body {
              background: #121212;
              color: #eee;
              font: 16px Arial, sans-serif;
              padding: 30px;
              text-align: center;
              margin: 0;
            }

            .container {
              max-width: 700px;
              margin: 50px auto;
              padding: 30px;
              background: #181818;
              border-radius: 10px;
              box-shadow: 0 4px 10px rgba(0, 0, 0, 0.35);
            }

            h2 {
              margin-top: 0;
              color: #fff;
            }

            .status {
              font-size: 24px;
              font-weight: bold;
              margin: 25px 0;
            }

            .online {
              color: #57f287;
            }

            .offline {
              color: #ed4245;
            }

            .info {
              background: #202020;
              border-radius: 8px;
              padding: 15px 20px;
              margin: 10px 0;
              display: flex;
              justify-content: space-between;
            }

            .label {
              color: #aaa;
            }

            .value {
              color: #fff;
              font-weight: bold;
            }

            .btn {
              display: inline-block;
              margin-top: 20px;
              padding: 12px 24px;
              font-size: 16px;
              color: white;
              background: #5865f2;
              border-radius: 6px;
              text-decoration: none;
              transition: background 0.2s;
            }

            .btn:hover {
              background: #4752c4;
            }

            .updated {
              margin-top: 15px;
              color: #666;
              font-size: 13px;
            }
          </style>
        </head>

        <body>
          <div class="container">

            <h2>📊 Bot Status</h2>

            <div class="info">
              <span class="label">Ping</span>
              <span class="value">${ping} ${ping !== "N/A" ? "ms" : ""}</span>
            </div>

            <div class="info">
              <span class="label">Uptime</span>
              <span class="value">${uptime}</span>
            </div>

            <div class="info">
              <span class="label">Text Commands</span>
              <span class="value">
                ${botStatus.commandEnabled ? "🟢 ON" : "🔴 OFF"}
              </span>
            </div>

            <div class="info">
              <span class="label">Voice Updates</span>
              <span class="value">
                ${botStatus.voiceStateUpdate ? "🟢 ON" : "🔴 OFF"}
              </span>
            </div>

            <div class="info">
              <span class="label">Message Forwarding</span>
              <span class="value">
                ${botStatus.forwardingEnabled ? "🟢 ON" : "🔴 OFF"}
              </span>
            </div>

            <div class="updated">
              Page refreshes automatically every 10 seconds
            </div>

            <a href="/" class="btn">Back to Home</a>

          </div>
        </body>
      </html>
    `);
  } catch (err) {
    console.error("Error loading status page:", err);
    res.status(500).send("⚠️ Error loading bot status.");
  }
});

export default router;