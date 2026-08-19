import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Discord Bot</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            text-align: center;
            margin-top: 50px;
            background-color: #f4f4f9;
            color: #333;
          }
          .container {
            display: inline-block;
            padding: 40px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
          }
          .btn {
            display: inline-block;
            margin: 10px;
            padding: 12px 24px;
            font-size: 16px;
            color: white;
            background-color: #5865F2;
            border: none;
            border-radius: 5px;
            text-decoration: none;
            cursor: pointer;
            transition: background 0.2s;
          }
          .btn:hover {
            background-color: #4752C4;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>✅ Discord bot running</h2>
          <p>Select a page below:</p>
          <div>
            <a href="/upload" class="btn">Upload Page</a>
            <a href="/status" class="btn">Status Page</a>
            <a href="/overview" class="btn">Overview Page</a>
          </div>
        </div>
      </body>
    </html>
  `);
});

export default router;
