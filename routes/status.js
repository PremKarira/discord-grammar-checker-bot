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
            padding: 10px 20px;
            font-size: 14px;
            color: white;
            background-color: #4f545c;
            border: none;
            border-radius: 5px;
            text-decoration: none;
            cursor: pointer;
          }
          .btn:hover {
            background-color: #72767d;
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
