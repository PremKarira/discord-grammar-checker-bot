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
              font-family: Arial, sans-serif;
              background-color: #f4f4f9;
              color: #333;
              margin: 0;
              padding: 20px;
            }
            .container {
              max-width: 800px;
              margin: 0 auto;
              background: white;
              padding: 30px;
              border-radius: 8px;
              box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
            }
            h2 {
              margin-top: 0;
            }
            .section {
              margin-bottom: 20px;
              padding-bottom: 15px;
              border-bottom: 1px solid #eee;
            }
            ul {
              margin: 5px 0;
              padding-left: 20px;
            }
            .btn {
              display: inline-block;
              margin-top: 15px;
              padding: 10px 20px;
              font-size: 14px;
              color: white;
              background-color: #5865F2;
              border: none;
              border-radius: 5px;
              text-decoration: none;
              cursor: pointer;
            }
            .btn:hover {
              background-color: #4752C4;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>� Bot Overview & Status Info</h2>
            
            <div class="section">
              <h3>⚙️ Bot Status</h3>
              <p><strong>Text Commands:</strong> ${botStatus.commandEnabled ? "🟢 ON" : "🔴 OFF"}</p>
              <p><strong>Voice State Updates:</strong> ${botStatus.voiceStateUpdate ? "🟢 ON" : "🔴 OFF"}</p>
              <p><strong>Message Forwarding:</strong> ${botStatus.forwardingEnabled ? "🟢 ON" : "🔴 OFF"}</p>
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
