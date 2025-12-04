import fetch from "node-fetch";
import zlib from "zlib";
import { reportError } from "./reportError.js";

function splitMessage(text, maxLength = 2000) {
  const parts = text.split(/(?=^#{1,3}\s)/gm);

  const chunks = [];
  let current = "";

  for (const part of parts) {
    if ((current + part).length > maxLength) {
      if (current) chunks.push(current.trim());
      // If part itself is too long, split by lines
      if (part.length > maxLength) {
        const lines = part.split("\n");
        let temp = "";
        for (const line of lines) {
          if ((temp + line + "\n").length > maxLength) {
            if (temp) chunks.push(temp.trim());
            temp = line + "\n";
          } else {
            temp += line + "\n";
          }
        }
        if (temp.trim()) chunks.push(temp.trim());
        current = "";
      } else {
        current = part;
      }
    } else {
      current += part;
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

export async function searchText(client, message, text) {
  try {
    const searchingReaction = await message.react("⏳");

    const response = await fetch(process.env.N8N_SEARCH_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.N8N_AUTH_HEADER,
      },
      body: JSON.stringify({ query: text }),
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

    if (!textResponse.trim()) throw new Error("Empty response from webhook");

    // Parse JSON and get final_result
    let finalResult;
    try {
      const json = JSON.parse(textResponse);
      finalResult = json.final_result?.toString().trim();
    } catch {
      throw new Error("Invalid JSON from webhook");
    }

    if (!finalResult) throw new Error("final_result is empty");

    // Split long text and send each chunk
    const messages = splitMessage(finalResult, 2000);
    for (const msg of messages) {
      await message.reply(msg);
    }

    try {
      await searchingReaction.remove();
    } catch {}
  } catch (err) {
    const guildId = message.guild?.id || "@me";
    const messageLink = `https://discord.com/channels/${guildId}/${message.channel.id}/${message.id}`;
    await reportError(
      client,
      err,
      `SearchText: ${text} | ${message.author.tag} | [Jump to Message](${messageLink})`,
    );
  }
}
export { splitMessage };
