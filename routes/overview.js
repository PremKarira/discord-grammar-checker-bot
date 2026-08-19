import { Router } from "express";
import { getUsers, getBotStatus } from "../config/db.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const users = await getUsers();
    const botStatus = await getBotStatus();

    const renderList = (ids = []) => {
      if (!ids.length) return "<li>— None</li>";
      return ids.map(id => `<li><code>${id}</code></li>`).join("");
    };

    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Overview & Bot Info Page</title>
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
              max-width: 900px;
              margin: 50px auto;
              padding: 30px;
              background: #181818;
              border-radius: 10px;
              box-shadow: 0 4px 10px rgba(0, 0, 0, 0.35);
              text-align: left;
            }

            h2 {
              margin-top: 0;
              color: #fff;
              text-align: center;
            }

            h3 {
              color: #fff;
              margin-top: 0;
            }

            p {
              color: #aaa;
            }

            .section {
              margin-bottom: 20px;
              padding-bottom: 15px;
              border-bottom: 1px solid #2a2a2a;
            }

            .section:last-of-type {
              border-bottom: none;
            }

            ul {
              margin: 5px 0;
              padding-left: 20px;
              color: #ccc;
            }

            li {
              margin: 6px 0;
            }

            code {
              background: #222;
              color: #ddd;
              padding: 4px 7px;
              border-radius: 4px;
              font-family: Consolas, monospace;
            }

            .btn {
              display: inline-block;
              margin: 10px 0 0;
              padding: 12px 24px;
              font-size: 16px;
              color: white;
              background: #5865f2;
              border: none;
              border-radius: 6px;
              text-decoration: none;
              cursor: pointer;
              transition: background 0.2s;
            }

            .btn:hover {
              background: #4752c4;
            }
          </style>
        </head>

        <body>
          <div class="container">
            <h2>📊 Bot Overview & Status Info</h2>

            <div class="section">
              <h3>⚙️ Bot Status</h3>
              <p>
                <strong>Text Commands:</strong>
                ${botStatus.commandEnabled ? "🟢 ON" : "🔴 OFF"}
              </p>

              <p>
                <strong>Voice State Updates:</strong>
                ${botStatus.voiceStateUpdate ? "🟢 ON" : "🔴 OFF"}
              </p>

              <p>
                <strong>Message Forwarding:</strong>
                ${botStatus.forwardingEnabled ? "🟢 ON" : "🔴 OFF"}
              </p>
            </div>

            <div class="section">
              <h3>🧪 Testers</h3>
              <ul>${renderList(users.testers)}</ul>
            </div>

            <div class="section">
              <h3>🎯 Grammar Targets</h3>
              <ul>${renderList(users.targets)}</ul>
            </div>

            <div class="section">
              <h3>🎙️ Voice Targets</h3>
              <ul>${renderList(users.voiceTargets)}</ul>
            </div>

            <div class="section">
              <h3>💬 Reply Targets</h3>
              <ul>${renderList(users.replyTargets)}</ul>
            </div>

            <a href="/" class="btn">Back to Home</a>
          </div>
        </body>
      </html>
    `);
  } catch (err) {
    console.error("Error loading logs/users page:", err);
    res.status(500).send("⚠️ Error loading logs/status data.");
  }
});

export default router;