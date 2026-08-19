import express from "express";
import multer from "multer";
import axios from "axios";
import FormData from "form-data";
import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import { spawn } from "child_process";
import ffmpegPath from "ffmpeg-static";
import { saveUpload, getUploads } from "../config/db.js";

const router = express.Router();

const MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1 GiB
const MAX_PART_SIZE = 30 * 1024 * 1024; // 30 MiB
const MAX_SINGLE_SIZE = 200 * 1024 * 1024; // 200 MiB

const TEMP_ROOT = path.join(os.tmpdir(), "ngnl-uploads");

const jobs = new Map();

let discordClient = null;

fs.mkdirSync(TEMP_ROOT, { recursive: true });

export function setUploadDiscordClient(client) {
  discordClient = client;
}

async function waitForDiscordClient() {
  if (!discordClient) {
    throw new Error("Discord client has not been configured.");
  }

  if (discordClient.isReady()) {
    return;
  }

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(
        new Error(
          "Discord client did not become ready within 60 seconds.",
        ),
      );
    }, 60_000);

    const cleanup = () => {
      clearTimeout(timeout);
      discordClient.off("ready", onReady);
      discordClient.off("error", onError);
    };

    const onReady = () => {
      cleanup();
      resolve();
    };

    const onError = (error) => {
      cleanup();
      reject(error);
    };

    discordClient.once("ready", onReady);
    discordClient.once("error", onError);
  });
}

function escapeHTML(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function uploadDirectory(hex) {
  return path.join(TEMP_ROOT, hex);
}

function removeDirectory(directory) {
  fs.rmSync(directory, {
    recursive: true,
    force: true,
  });
}

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    const hex = crypto.randomBytes(8).toString("hex");
    const directory = uploadDirectory(hex);

    fs.mkdirSync(directory, {
      recursive: true,
    });

    req.uploadHex = hex;

    callback(null, directory);
  },

  filename: (req, file, callback) => {
    callback(null, "source");
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
});

function runFFmpeg(args, { allowFailure = false } = {}) {
  if (!ffmpegPath) {
    throw new Error("FFmpeg is not available on this server.");
  }

  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, [
      "-hide_banner",
      "-y",
      ...args,
    ]);

    let output = "";

    child.stderr.on("data", (chunk) => {
      output += chunk.toString();
    });

    child.on("error", reject);

    child.on("close", (code) => {
      if (code === 0 || allowFailure) {
        return resolve(output);
      }

      return reject(
        new Error(
          `FFmpeg failed (exit ${code}): ${output.slice(-1200)}`,
        ),
      );
    });
  });
}

async function getVideoDuration(filePath) {
  const output = await runFFmpeg(
    [
      "-i",
      filePath,
      "-f",
      "null",
      "-",
    ],
    {
      allowFailure: true,
    },
  );

  const match = output.match(
    /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/i,
  );

  if (!match) {
    throw new Error("Could not read the video duration.");
  }

  return (
    Number(match[1]) * 3600 +
    Number(match[2]) * 60 +
    Number(match[3])
  );
}

/**
 * Upload a file to Catbox.
 */
async function uploadFileToCatbox(
  filePath,
  filename,
  contentType,
) {
  const form = new FormData();

  form.append("reqtype", "fileupload");

  form.append(
    "fileToUpload",
    fs.createReadStream(filePath),
    {
      filename,
      contentType,
    },
  );

  const response = await axios.post(
    "https://catbox.moe/user/api.php",
    form,
    {
      headers: form.getHeaders(),
      timeout: 10 * 60 * 1000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    },
  );

  const url = String(response.data).trim();

  if (!url.startsWith("http")) {
    throw new Error(`Catbox failed: ${url}`);
  }

  return url;
}

/**
 * Normalize a video to MP4.
 *
 * Used by both single-file and split modes.
 */
async function normalizeVideo(sourcePath, outputPath) {
  await runFFmpeg([
    "-i",
    sourcePath,

    "-map",
    "0:v:0?",

    "-map",
    "0:a?",

    "-c:v",
    "libx264",

    "-preset",
    "veryfast",

    "-crf",
    "23",

    "-c:a",
    "aac",

    "-movflags",
    "+faststart",

    outputPath,
  ]);
}

/**
 * Create parts that are each <= 30 MiB.
 */
async function createVideoParts(sourcePath, directory) {
  const normalizedPath = path.join(
    directory,
    "normalized.mp4",
  );

  await normalizeVideo(
    sourcePath,
    normalizedPath,
  );

  const duration = await getVideoDuration(
    normalizedPath,
  );

  const normalizedSize =
    fs.statSync(normalizedPath).size;

  /*
   * Start at 90% of the maximum to leave some safety
   * margin for keyframe/container overhead.
   */
  const targetSize = Math.floor(
    MAX_PART_SIZE * 0.9,
  );

  let segmentDuration = Math.max(
    2,
    Math.min(
      900,
      (duration * targetSize) /
        normalizedSize,
    ),
  );

  const parts = [];

  let start = 0;

  while (start < duration - 0.05) {
    let candidateDuration = Math.min(
      segmentDuration,
      duration - start,
    );

    let outputPath;

    for (;;) {
      outputPath = path.join(
        directory,
        `part-${String(
          parts.length + 1,
        ).padStart(3, "0")}.mp4`,
      );

      await runFFmpeg([
        "-ss",
        String(start),

        "-i",
        normalizedPath,

        "-t",
        String(candidateDuration),

        "-map",
        "0",

        "-c",
        "copy",

        "-movflags",
        "+faststart",

        outputPath,
      ]);

      const outputSize =
        fs.statSync(outputPath).size;

      if (outputSize <= MAX_PART_SIZE) {
        break;
      }

      fs.rmSync(outputPath, {
        force: true,
      });

      candidateDuration *= 0.7;

      if (candidateDuration < 1) {
        throw new Error(
          "Could not create a video part below 30 MiB.",
        );
      }
    }

    parts.push(outputPath);

    start += candidateDuration;

    segmentDuration = Math.min(
      segmentDuration,
      candidateDuration,
    );
  }

  return parts;
}

/**
 * Send generated URLs to Discord.
 */
async function sendLinksToDiscord({
  filename,
  username,
  urls,
}) {
  const channelId =
    process.env.SUPPORT_CHANNEL_ID;

  if (!channelId) {
    throw new Error(
      "SUPPORT_CHANNEL_ID is not configured.",
    );
  }

  await waitForDiscordClient();

  const channel =
    await discordClient.channels.fetch(
      channelId,
    );

  if (!channel?.isTextBased()) {
    throw new Error(
      "SUPPORT_CHANNEL_ID does not refer to a text channel.",
    );
  }

  for (
    let index = 0;
    index < urls.length;
    index++
  ) {
    await channel.send({
      content:
        `**${filename}** — uploaded by ${username} — ` +
        `part ${index + 1}/${urls.length}\n` +
        `${urls[index]}`,
    });
  }

  return channelId;
}

/**
 * Process an uploaded file.
 */
async function processUpload(job) {
  const {
    hex,
    filename,
    username,
    type,
    mode,
    sourcePath,
    directory,
    size,
  } = job;

  jobs.set(hex, {
    ...job,
    status: "processing",
    message:
      type === "video" && mode === "single"
        ? "Processing video as a single file..."
        : type === "video"
          ? "Creating video parts..."
          : "Preparing image...",
  });

  try {
    let partPaths;

    /**
     * VIDEO
     */
    if (type === "video") {
      /**
       * SINGLE MODE
       *
       * Normalize the video and allow up to 200 MiB.
       */
      if (mode === "single") {
        const normalizedPath = path.join(
          directory,
          "normalized.mp4",
        );

        await normalizeVideo(
          sourcePath,
          normalizedPath,
        );

        const normalizedSize =
          fs.statSync(normalizedPath).size;

        if (normalizedSize > MAX_SINGLE_SIZE) {
          throw new Error(
            `The processed video is ${(
              normalizedSize /
              1024 /
              1024
            ).toFixed(
              1,
            )} MiB, which is larger than the 200 MiB single-file limit. Choose "Split into parts" instead.`,
          );
        }

        partPaths = [normalizedPath];
      }

      /**
       * PARTS MODE
       */
      else {
        partPaths =
          await createVideoParts(
            sourcePath,
            directory,
          );
      }
    }

    /**
     * IMAGE
     */
    else {
      const imageSize =
        fs.statSync(sourcePath).size;

      if (imageSize > MAX_PART_SIZE) {
        throw new Error(
          "Images must be smaller than 30 MiB.",
        );
      }

      partPaths = [sourcePath];
    }

    jobs.set(hex, {
      ...jobs.get(hex),
      status: "uploading",
      message:
        partPaths.length === 1
          ? "Uploading file to Catbox..."
          : `Uploading ${partPaths.length} parts to Catbox...`,
    });

    const baseName = path.basename(
      filename,
      path.extname(filename),
    );

    const extension =
      type === "video"
        ? ".mp4"
        : path.extname(filename);

    const contentType =
      type === "video"
        ? "video/mp4"
        : "application/octet-stream";

    const urls = [];

    for (
      let index = 0;
      index < partPaths.length;
      index++
    ) {
      const catboxName =
        partPaths.length === 1
          ? type === "video"
            ? `${baseName}.mp4`
            : filename
          : `${baseName}-part-${
              index + 1
            }${extension}`;

      urls.push(
        await uploadFileToCatbox(
          partPaths[index],
          catboxName,
          contentType,
        ),
      );

      jobs.set(hex, {
        ...jobs.get(hex),
        status: "uploading",
        message:
          `Uploaded ${index + 1}/${partPaths.length} file(s) to Catbox...`,
      });
    }

    /**
     * Save upload to database.
     */
    await saveUpload({
      hex,
      username,
      filename,
      type,
      mode,
      size,
      parts: urls,
      partCount: urls.length,
      createdAt: new Date(),
    });

    jobs.set(hex, {
      ...jobs.get(hex),
      status: "sending",
      message:
        "Sending links to Discord...",
      parts: urls,
    });

    /**
     * Send URLs to Discord.
     */
    await sendLinksToDiscord({
      filename,
      username,
      urls,
    });

    jobs.set(hex, {
      ...jobs.get(hex),
      status: "complete",
      message:
        "Upload complete. Links were sent to Discord.",
      parts: urls,
    });
  } catch (error) {
    console.error(
      `Upload ${hex} failed:`,
      error,
    );

    jobs.set(hex, {
      ...jobs.get(hex),
      status: "failed",
      message:
        error?.message ||
        "Upload processing failed.",
    });
  } finally {
    removeDirectory(directory);
  }
}

/**
 * Upload page.
 */
router.get("/", async (req, res) => {
  const uploads = await getUploads();

  const rows = uploads
    .map(
      (upload) =>
        `<tr>
          <td>${escapeHTML(
            upload.hex,
          )}</td>

          <td>${escapeHTML(
            upload.filename,
          )}</td>

          <td>${escapeHTML(
            upload.username,
          )}</td>

          <td>${escapeHTML(
            upload.mode || "parts",
          )}</td>

          <td>${upload.partCount || 0}</td>

          <td>
            <a
              href="${escapeHTML(
                upload.parts?.[0] || "#",
              )}"
              target="_blank"
              rel="noreferrer"
            >
              Open
            </a>
          </td>
        </tr>`,
    )
    .join("");

  res.send(`
<!doctype html>

<html>
<head>
  <title>Upload file</title>

  <style>
    body {
      background: #121212;
      color: #eee;
      font: 16px Arial, sans-serif;
      padding: 30px;
    }

    .container {
      max-width: 900px;
      margin: auto;
    }

    .card {
      background: #181818;
      padding: 20px;
      border-radius: 10px;
      margin-bottom: 20px;
    }

    input,
    select,
    button {
      background: #1e1e1e;
      color: #fff;
      border: 1px solid #444;
      padding: 10px;
      border-radius: 6px;
      margin: 5px;
    }

    button {
      background: #5865f2;
      border: 0;
      cursor: pointer;
    }

    .progress {
      height: 18px;
      background: #333;
      border-radius: 5px;
      overflow: hidden;
    }

    .bar {
      height: 100%;
      width: 0;
      background: #5865f2;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    td,
    th {
      border: 1px solid #444;
      padding: 8px;
    }

    a {
      color: #55b7ff;
    }

    .hint {
      color: #aaa;
      font-size: 14px;
      margin: 8px 5px;
    }
  </style>
</head>

<body>

  <div class="container">

    <div class="card">

      <h1>Upload file</h1>

      <p>
        Videos are processed on the server after upload.
        You may close this page once it says the job is queued.
      </p>

      <form id="uploadForm">

        <input
          name="username"
          placeholder="Discord username"
          required
        >

        <input
          name="file"
          type="file"
          required
        >

        <select name="type" id="typeSelect">
          <option value="video">
            Video
          </option>

          <option value="image">
            Image
          </option>
        </select>

        <select name="mode" id="modeSelect">
          <option value="parts">
            Split into parts (30 MiB each)
          </option>

          <option value="single">
            Single file (up to 200 MiB)
          </option>
        </select>

        <button>
          Upload
        </button>

      </form>

      <p class="hint" id="modeHint">
        Split mode divides the video into multiple files,
        each no larger than 30 MiB.
      </p>

      <div class="progress">
        <div
          id="bar"
          class="bar"
        ></div>
      </div>

      <p id="status"></p>

    </div>

    <div class="card">

      <h2>Completed uploads</h2>

      <table>

        <tr>
          <th>Hex</th>
          <th>File</th>
          <th>User</th>
          <th>Mode</th>
          <th>Parts</th>
          <th>Link</th>
        </tr>

        ${
          rows ||
          "<tr><td colspan='6'>No uploads yet</td></tr>"
        }

      </table>

    </div>

  </div>

  <script>
    const form =
      document.querySelector("#uploadForm");

    const status =
      document.querySelector("#status");

    const bar =
      document.querySelector("#bar");

    const typeSelect =
      document.querySelector("#typeSelect");

    const modeSelect =
      document.querySelector("#modeSelect");

    const modeHint =
      document.querySelector("#modeHint");

    function updateModeUI() {
      if (typeSelect.value === "image") {
        modeSelect.value = "single";
        modeSelect.disabled = true;

        modeHint.textContent =
          "Images are uploaded as a single file and must be smaller than 30 MiB.";
      } else {
        modeSelect.disabled = false;

        if (modeSelect.value === "single") {
          modeHint.textContent =
            "Single-file mode allows a processed video up to 200 MiB.";
        } else {
          modeHint.textContent =
            "Split mode divides the video into multiple files, each no larger than 30 MiB.";
        }
      }
    }

    typeSelect.addEventListener(
      "change",
      updateModeUI,
    );

    modeSelect.addEventListener(
      "change",
      updateModeUI,
    );

    updateModeUI();

    form.addEventListener(
      "submit",
      (event) => {
        event.preventDefault();

        bar.style.width = "0%";

        status.textContent =
          "Uploading to server...";

        const request =
          new XMLHttpRequest();

        request.open(
          "POST",
          "/upload",
        );

        request.upload.onprogress =
          (event) => {
            if (event.lengthComputable) {
              const percent =
                (event.loaded /
                  event.total) *
                100;

              bar.style.width =
                percent + "%";

              status.textContent =
                "Uploading to server: " +
                Math.round(percent) +
                "%";
            }
          };

        request.onload = () => {
          try {
            const data =
              JSON.parse(
                request.responseText,
              );

            if (request.status === 202) {
              status.textContent =
                "Queued. Server will process it and send the links to Discord. Upload ID: " +
                data.hex;
            } else {
              status.textContent =
                data.error ||
                "Upload failed.";
            }
          } catch {
            status.textContent =
              request.responseText ||
              "Upload failed.";
          }
        };

        request.onerror = () => {
          status.textContent =
            "Network error during upload.";
        };

        request.send(
          new FormData(form),
        );
      },
    );
  </script>

</body>
</html>
  `);
});

/**
 * Job status.
 */
router.get(
  "/status/:hex",
  (req, res) => {
    const job =
      jobs.get(req.params.hex);

    if (!job) {
      return res
        .status(404)
        .json({
          error:
            "Upload job not found.",
        });
    }

    return res.json({
      hex: job.hex,
      status: job.status,
      message: job.message,
      mode: job.mode,
      parts: job.parts || [],
    });
  },
);

/**
 * Receive upload.
 */
router.post(
  "/",
  upload.single("file"),
  (req, res) => {
    if (!req.file) {
      return res
        .status(400)
        .json({
          error: "Select a file.",
        });
    }

    const type = req.body.type;

    const mode =
      req.body.mode || "parts";

    const username =
      String(
        req.body.username || "",
      ).trim();

    if (
      !username ||
      !["video", "image"].includes(
        type,
      ) ||
      !["single", "parts"].includes(
        mode,
      )
    ) {
      removeDirectory(
        req.file.destination,
      );

      return res
        .status(400)
        .json({
          error:
            "A username, valid file type, and valid upload mode are required.",
        });
    }

    /**
     * Images don't support splitting.
     */
    if (
      type === "image" &&
      mode !== "single"
    ) {
      removeDirectory(
        req.file.destination,
      );

      return res
        .status(400)
        .json({
          error:
            "Images can only be uploaded as a single file.",
        });
    }

    const job = {
      hex: req.uploadHex,

      filename:
        path.basename(
          req.file.originalname,
        ),

      username,

      type,

      mode,

      sourcePath:
        req.file.path,

      directory:
        req.file.destination,

      size:
        req.file.size,

      status: "queued",

      message:
        "Upload received. Waiting for server processing.",
    };

    jobs.set(
      job.hex,
      job,
    );

    res.status(202).json({
      hex: job.hex,
      status: "queued",
      statusUrl:
        `/upload/status/${job.hex}`,
    });

    setImmediate(() =>
      void processUpload(job),
    );
  },
);

/**
 * Multer / upload errors.
 */
router.use(
  (error, req, res, next) => {
    if (
      error instanceof
        multer.MulterError &&
      error.code ===
        "LIMIT_FILE_SIZE"
    ) {
      return res
        .status(400)
        .json({
          error:
            "File is larger than the 1 GiB limit.",
        });
    }

    console.error(
      "Upload route error:",
      error,
    );

    return res
      .status(500)
      .json({
        error: "Upload failed.",
      });
  },
);

export default router;