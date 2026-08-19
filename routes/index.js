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
        <div class="container">
          ${pageContent}
        </div>
      </body>
    </html>
  `);
});

export default router;
