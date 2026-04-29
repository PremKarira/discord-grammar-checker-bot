import axios from "axios";
import fetch from "node-fetch";
import { GoogleGenAI } from "@google/genai";
import { EmbedBuilder } from "discord.js";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const WEARS = [
  "Factory New",
  "Minimal Wear",
  "Field-Tested",
  "Well-Worn",
  "Battle-Scarred",
];

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

// ----------------------
// Steam API
// ----------------------
async function getSteamPrice(name, retries = 3) {
  const url = `https://steamcommunity.com/market/priceoverview/?appid=730&currency=24&market_hash_name=${encodeURIComponent(name)}`;

  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      const data = await res.json();

      if (data && typeof data === "object") {
        return data;
      }
    } catch {}

    await delay(800);
  }

  return { success: false };
}

// ----------------------
// Detect wear
// ----------------------
async function hasWear(name) {
  const test = await getSteamPrice(`${name} (Factory New)`);
  return test?.volume;
}

// ----------------------
// Command
// ----------------------
export async function cscheckCommand(message) {
  try {
    if (!message.reference) {
      return message.reply("❌ Reply to weekly drop image.");
    }

    const repliedMsg = await message.fetchReference();
    const attachment = repliedMsg.attachments.first();
    if (!attachment) return message.reply("❌ No image.");

    const base64 = await fetchImageAsBase64(attachment.url);

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Analyze CS2 weekly drop image.

Return JSON:
[
 { "name": "", "type": "" }
]

Only JSON.`,
            },
            {
              inlineData: {
                mimeType: "image/png",
                data: base64,
              },
            },
          ],
        },
      ],
      config: { temperature: 0.1 },
    });

    let items;
    try {
      items = JSON.parse(response.text);
    } catch {
      return message.reply("❌ Gemini parse fail.");
    }

    const embeds = [];

    for (const item of items) {
      await delay(500);

      const embed = new EmbedBuilder()
        .setTitle(item.name)
        .setColor(0x00bcd4);

      const wearExists = await hasWear(item.name);

      // -------- NO WEAR --------
      if (!wearExists) {
        const steam = await getSteamPrice(item.name);

        embed.setDescription(
          steam?.lowest_price
            ? `💰 ${steam.lowest_price} (Steam)`
            : "❌ No data"
        );

        embeds.push(embed);
        continue;
      }

      // -------- HAS WEAR --------
      let fieldText = "";
      let prices = [];

      for (const wear of WEARS) {
        await delay(400);

        const fullName = `${item.name} (${wear})`;
        const steam = await getSteamPrice(fullName);

        if (steam?.success && steam.lowest_price) {
          const price = parseFloat(
            steam.lowest_price.replace(/[^\d.]/g, "")
          );
          prices.push(price);
          fieldText += `**${wear}**: ₹${price}\n`;
        } else {
          fieldText += `**${wear}**: ❌\n`;
        }
      }

      if (prices.length) {
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        fieldText += `\n💰 Range: ₹${min} → ₹${max}`;
      }

      embed.setDescription(fieldText || "❌ No data");

      embeds.push(embed);
    }

    // send max 4 embeds (Discord limit safe)
    await message.reply({ embeds: embeds.slice(0, 4) });

  } catch (err) {
    console.error(err);
    message.reply("❌ Failed.");
  }
}

// ----------------------
// Image fetch
// ----------------------
async function fetchImageAsBase64(url) {
  const res = await axios.get(url, { responseType: "arraybuffer" });
  return Buffer.from(res.data).toString("base64");
}