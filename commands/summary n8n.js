import fetch from "node-fetch";
import zlib from "zlib";
import { splitMessage } from "../utils/search.js";

import { reportError } from "../utils/reportError.js";

export async function summaryCommand(message, count) {
  try {
    const reaction = await message.react("⏳");

    // 1️⃣ Fetch last N messages
    const fetched = await message.channel.messages.fetch({ limit: count });

    const msgs = [...fetched.values()]
      .reverse()
      .map((m) => `**${m.author.username}:** ${m.content || "(no text)"}`)
      .join("\n");

    // 2️⃣ Send to n8n
    const response = await fetch(process.env.N8N_SEARCH_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.N8N_AUTH_HEADER,
      },
      body: JSON.stringify({
        query: msgs,
        mode: "summary",
      }),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const buffer = Buffer.from(await response.arrayBuffer());
    const encoding = response.headers.get("content-encoding");

    let textResponse;
    try {
      switch (encoding) {
        case "br":
          textResponse = zlib.brotliDecompressSync(buffer).toString("utf-8");
          break;
        case "gzip":
          textResponse = zlib.gunzipSync(buffer).toString("utf-8");
          break;
        case "deflate":
          textResponse = zlib.inflateSync(buffer).toString("utf-8");
          break;
        default:
          textResponse = buffer.toString("utf-8");
      }
    } catch {
      textResponse = buffer.toString("utf-8");
    }

    // 3️⃣ Parse JSON from n8n
    let finalResult;
    try {
      const json = JSON.parse(textResponse);
      finalResult = json.final_result?.trim();
    } catch {
      throw new Error("Invalid JSON from webhook");
    }

    if (!finalResult) throw new Error("Webhook final_result empty");

    // 4️⃣ Split & reply
    const chunks = splitMessage(finalResult, 2000);

    for (const c of chunks) {
      await message.reply(c);
    }

    try {
      await reaction.remove();
    } catch {}
  } catch (err) {
    const guildId = message.guild?.id || "@me";
    const link = `https://discord.com/channels/${guildId}/${message.channel.id}/${message.id}`;
    await reportError(
      message.client,
      err,
      `SummaryCommand (${count}) | ${message.author.tag} | [Jump](${link})`,
    );
  }
}
