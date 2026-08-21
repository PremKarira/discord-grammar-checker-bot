import { Router } from "express";
const router = Router();
router.get("/", (req, res) => {
  const pageContent = req.user
    ? `
          <h2>✅ Discord bot running</h2>
          <p>Choose a page:</p>
          <div>
            <a href="/upload" class="btn">Upload</a>
            <a href="/status" class="btn">Status</a>
            <a href="/overview" class="btn">Overview</a>
          </div>
          <p><a href="/auth/logout">Log out</a></p>
      `
    : `
          <h2>Discord login required</h2>
          <p>Log in with Discord to access the bot pages.</p>
          <a href="/auth/discord" class="btn">Login with Discord</a>
      `;

  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Discord Bot</title>
        <style>
          body {
            background: #121212;
            color: #eee;
            font: 16px Arial, sans-serif;
            padding: 30px;
            text-align: center;
          }
          .icon-btn {
            align-items: center;
            background: #5865f2;
            border-radius: 999px;
            color: #fff;
            display: inline-flex;
            height: 44px;
            justify-content: center;
            position: fixed;
            right: 22px;
            text-decoration: none;
            top: 22px;
            transition: background 0.2s, transform 0.2s;
            width: 44px;
            z-index: 10;
          }
          .icon-btn:hover {
            background: #4752c4;
            transform: translateY(-1px);
          }
          .icon-btn svg {
            height: 22px;
            width: 22px;
          }
          .container {
            max-width: 900px;
            margin: 50px auto;
            padding: 30px;
            background: #181818;
            border-radius: 10px;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.35);
          }
          .btn {
            display: inline-block;
            margin: 10px;
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
          p {
            color: #aaa;
          }
          p a {
            color: #55b7ff;
          }
        </style>
      </head>
      <body>
        <a class="icon-btn" href="/legacy-edm-shuffle" aria-label="Legacy EDM Shuffle" title="Legacy EDM Shuffle">
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18.7 10 16 6H8l-2.7 4-1.8 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2"></path>
            <circle cx="7" cy="17" r="2"></circle>
            <circle cx="17" cy="17" r="2"></circle>
            <path d="M9 10h6"></path>
          </svg>
        </a>
        <div class="container">
          ${pageContent}
        </div>
      </body>
    </html>
  `);
});

export default router;
