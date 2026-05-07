import axios from "axios";
import fetch from "node-fetch";
import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} from "discord.js";
import { GoogleGenAI } from "@google/genai";

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

// ----------------------
// Steam API
// ----------------------
async function getSteamPrice(name, retries = 3) {
  const url = `https://steamcommunity.com/market/priceoverview/?appid=730&currency=24&market_hash_name=${encodeURIComponent(name)}`;

  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (data && typeof data === "object") return data;
    } catch {}
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
export async function cscheckCommand(message, args = []) {
  try {
    let imageUrl = null;

    // ----------------------
    // 1. Reply image support
    // ----------------------
    if (message.reference) {
      const repliedMsg = await message.fetchReference();
      const attachment = repliedMsg.attachments.first();

      if (attachment) {
        imageUrl = attachment.url;
      }
    }

    // ----------------------
    // 2. Same message attachment
    // !cscheck + uploaded image
    // ----------------------
    if (!imageUrl) {
      const attachment = message.attachments.first();

      if (attachment) {
        imageUrl = attachment.url;
      }
    }

    // ----------------------
    // 3. Direct URL support
    // !cscheck https://...
    // ----------------------
    if (!imageUrl && args.length > 0) {
      const possibleUrl = args[0];

      if (
        possibleUrl.startsWith("http://") ||
        possibleUrl.startsWith("https://")
      ) {
        imageUrl = possibleUrl;
      }
    }

    if (!imageUrl) {
      return message.reply(
        "❌ Reply to image, attach image, or use:\n`!cscheck <image_url>`",
      );
    }

    const base64 = await fetchImageAsBase64(imageUrl);

    // ----------------------
    // Send initial loading message
    // ----------------------
    const loadingContainer = new ContainerBuilder()
      .setAccentColor(0xffcc00)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("⏳ Processing... (0/0)"),
      );

    const sentMsg = await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [loadingContainer],
    });

    // ----------------------
    // Gemini
    // ----------------------
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
 { "name": "" }
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
      return sentMsg.edit({ content: "❌ Gemini parse fail." });
    }

    const total = items.length;

    // ----------------------
    // Final container
    // ----------------------
    const container = new ContainerBuilder().setAccentColor(0x00bcd4);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      const progressContainer = new ContainerBuilder()
        .setAccentColor(0xffcc00)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `⏳ Processing... (${i + 1}/${total})\nCurrently: ${item.name}`,
          ),
        );

      await sentMsg.edit({
        flags: MessageFlags.IsComponentsV2,
        components: [progressContainer],
      });

      const wearExists = await hasWear(item.name);

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`## ${item.name}\n`),
      );

      if (!wearExists) {
        const steam = await getSteamPrice(item.name);

        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            steam?.lowest_price
              ? `💰 Base Item Price: ${steam.lowest_price}`
              : "❌ No data",
          ),
        );

        container.addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setStyle(ButtonStyle.Link)
              .setLabel("🔍 Search Market")
              .setURL(
                `https://steamcommunity.com/market/search?appid=730&q=${encodeURIComponent(
                  item.name,
                ).replace(/%20/g, "+")}`,
              ),
          ),
        );

        container.addSeparatorComponents(
          new SeparatorBuilder()
            .setSpacing(SeparatorSpacingSize.Small)
            .setDivider(true),
        );

        continue;
      }

      const results = await Promise.all(
        WEARS.map(async (wear) => {
          const fullName = `${item.name} (${wear})`;
          const steam = await getSteamPrice(fullName);

          if (steam?.success && steam.lowest_price) {
            return {
              wear,
              price: parseFloat(steam.lowest_price.replace(/[^\d.]/g, "")),
            };
          }

          return { wear, price: null };
        }),
      );

      const validPrices = results
        .filter((r) => r.price !== null)
        .map((r) => r.price);

      const pad = (str, len) => str.padEnd(len, " ");

      const wearText = results
        .map((r) => {
          const label = pad(r.wear, 14);
          return r.price !== null ? `${label}: ₹${r.price}` : `${label}: ❌`;
        })
        .join("\n");

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(wearText + "\n"),
      );

      if (validPrices.length) {
        const min = Math.min(...validPrices);
        const max = Math.max(...validPrices);

        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`📊 Range: ₹${min} → ₹${max}\n`),
        );
      } else {
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent("❌ No price data\n"),
        );
      }

      container.addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setStyle(ButtonStyle.Link)
            .setLabel("🔍 Search Market")
            .setURL(
              `https://steamcommunity.com/market/search?appid=730&q=${encodeURIComponent(
                item.name,
              ).replace(/%20/g, "+")}`,
            ),
        ),
      );

      container.addSeparatorComponents(
        new SeparatorBuilder()
          .setSpacing(SeparatorSpacingSize.Small)
          .setDivider(true),
      );
    }

    await sentMsg.edit({
      flags: MessageFlags.IsComponentsV2,
      components: [container],
    });
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
