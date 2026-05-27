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
import { MODELS } from "../config/models.js";

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

  console.log("Fetching Steam price:", name);

  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      const data = await res.json();

      if (data && typeof data === "object") {
        return data;
      }
    } catch (err) {
      console.log("Steam fetch retry:", i + 1);
    }
  }

  return { success: false };
}

// ----------------------
// Detect wear support
// ----------------------
async function hasWear(name) {
  const test = await getSteamPrice(`${name} (Factory New)`);

  return (
    test?.success && (test?.lowest_price || test?.median_price || test?.volume)
  );
}

// ----------------------
// Fetch image -> base64
// ----------------------
async function fetchImageAsBase64(url) {
  const res = await axios.get(url, {
    responseType: "arraybuffer",
  });

  return Buffer.from(res.data).toString("base64");
}

// ----------------------
// Render skin prices
// ----------------------
async function buildSkinContainer(itemName) {
  const container = new ContainerBuilder().setAccentColor(0x00bcd4);

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`## ${itemName}\n`),
  );

  const wearExists = await hasWear(itemName);

  // ----------------------
  // No wears
  // ----------------------
  if (!wearExists) {
    const steam = await getSteamPrice(itemName);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        steam?.lowest_price
          ? `💰 Base Item Price: ${steam.lowest_price}`
          : "❌ No market data",
      ),
    );

    container.addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Link)
          .setLabel("🔍 Search Market")
          .setURL(
            `https://steamcommunity.com/market/search?appid=730&q=${encodeURIComponent(
              itemName.replace(/\s*\([^)]*\)\s*$/, ""),
            ).replace(/%20/g, "+")}`,
          ),
      ),
    );

    return container;
  }

  // ----------------------
  // Wears
  // ----------------------
  const results = await Promise.all(
    WEARS.map(async (wear) => {
      const fullName = `${itemName} (${wear})`;

      const steam = await getSteamPrice(fullName);

      if (steam?.success && steam?.lowest_price) {
        return {
          wear,
          rawPrice: steam.lowest_price,
          price: parseFloat(steam.lowest_price.replace(/[^\d.]/g, "")),
        };
      }

      return {
        wear,
        rawPrice: null,
        price: null,
      };
    }),
  );

  const validPrices = results
    .filter((r) => r.price !== null)
    .map((r) => r.price);

  const pad = (str, len) => str.padEnd(len, " ");

  const wearText = results
    .map((r) => {
      const label = pad(r.wear, 14);

      return r.rawPrice ? `${label}: ${r.rawPrice}` : `${label}: ❌`;
    })
    .join("\n");

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent("```" + wearText + "```"),
  );

  if (validPrices.length) {
    const min = Math.min(...validPrices);
    const max = Math.max(...validPrices);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`📊 Range: ₹${min} → ₹${max}`),
    );
  } else {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent("❌ No valid price data"),
    );
  }

  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setStyle(ButtonStyle.Link)
        .setLabel("🔍 Search Market")
        .setURL(
          `https://steamcommunity.com/market/search?appid=730&q=${encodeURIComponent(
            itemName,
          ).replace(/%20/g, "+")}`,
        ),
    ),
  );

  container.addSeparatorComponents(
    new SeparatorBuilder()
      .setSpacing(SeparatorSpacingSize.Small)
      .setDivider(true),
  );

  return container;
}

// ----------------------
// Command
// ----------------------
export async function cscheckCommand(message, args = []) {
  try {
    let imageUrl = null;
    let directSkinName = null;

    // ----------------------
    // Reply image support
    // ----------------------
    if (message.reference) {
      try {
        const repliedMsg = await message.fetchReference();

        const attachment = repliedMsg.attachments.first();

        if (attachment) {
          imageUrl = attachment.url;
        }
      } catch {}
    }

    // ----------------------
    // Same message attachment
    // ----------------------
    if (!imageUrl) {
      const attachment = message.attachments.first();

      if (attachment) {
        imageUrl = attachment.url;
      }
    }

    // ----------------------
    // URL OR skin name
    // ----------------------
    if (!imageUrl && args.length > 0) {
      const input = args.join(" ").trim();

      if (input.startsWith("http://") || input.startsWith("https://")) {
        imageUrl = input;
      } else {
        directSkinName = input;
      }
    }

    // ----------------------
    // No input
    // ----------------------
    if (!imageUrl && !directSkinName) {
      return message.reply(
        "❌ Reply to image, attach image, use image URL, or:\n`!cscheck AK-47 | Redline`",
      );
    }

    // =====================================================
    // DIRECT SKIN MODE
    // =====================================================
    if (directSkinName) {
      const loadingContainer = new ContainerBuilder()
        .setAccentColor(0xffcc00)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `⏳ Checking market...\n## ${directSkinName}`,
          ),
        );

      const sentMsg = await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [loadingContainer],
      });

      const container = await buildSkinContainer(directSkinName);

      return sentMsg.edit({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
      });
    }

    // =====================================================
    // IMAGE MODE
    // =====================================================

    const base64 = await fetchImageAsBase64(imageUrl);

    const loadingContainer = new ContainerBuilder()
      .setAccentColor(0xffcc00)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("⏳ Processing image..."),
      );

    const sentMsg = await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [loadingContainer],
    });

    // ----------------------
    // Gemini Vision
    // ----------------------
    const response = await ai.models.generateContent({
      model: MODELS.MAIN,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Analyze this CS2 weekly drop screenshot.

Return ONLY valid JSON.

Format:
[
  {
    "name": "AK-47 | Redline"
  }
]

No markdown.
No explanation.
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
      config: {
        temperature: 0.1,
      },
    });

    let items;

    try {
      items = JSON.parse(response.text);
    } catch (err) {
      console.log(response.text);

      return sentMsg.edit({
        content: "❌ Gemini JSON parse failed.",
      });
    }

    if (!Array.isArray(items) || !items.length) {
      return sentMsg.edit({
        content: "❌ No items detected.",
      });
    }

    const finalContainer = new ContainerBuilder().setAccentColor(0x00bcd4);

    // ----------------------
    // Process each item
    // ----------------------
    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      const progressContainer = new ContainerBuilder()
        .setAccentColor(0xffcc00)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `⏳ Processing (${i + 1}/${items.length})\n## ${item.name}`,
          ),
        );

      await sentMsg.edit({
        flags: MessageFlags.IsComponentsV2,
        components: [progressContainer],
      });

      const built = await buildSkinContainer(item.name);

      // merge components
      finalContainer.components.push(...built.components);
    }

    // ----------------------
    // Final edit
    // ----------------------
    await sentMsg.edit({
      flags: MessageFlags.IsComponentsV2,
      components: [finalContainer],
    });
  } catch (err) {
    console.error(err);

    return message.reply("❌ Failed.");
  }
}
