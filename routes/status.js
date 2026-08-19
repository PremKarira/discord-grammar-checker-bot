import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
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
          }
          .container {
            max-width: 900px;
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
          p {
            color: #aaa;
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
        </style>
      </head>
      <body>
        <div class="container">
          <h2>📊 Bot Status Page</h2>
          <p>Status monitoring features will appear here.</p>
          <a href="/" class="btn">Back to Home</a>
        </div>
      </body>
    </html>
  `);
});

export default router;
