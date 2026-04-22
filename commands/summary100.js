import { GoogleGenAI } from "@google/genai";
import { splitMessage } from "../utils/search.js";
import { reportError } from "../utils/reportError.js";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

async function fetchMessages(channel, count) {
  let messages = [];
  let lastId = null;

  const progressMsg = await channel.send(
    `📥 Fetching messages... 0 / ${count}`,
  );

  while (messages.length < count) {
    const remaining = count - messages.length;

    const fetched = await channel.messages.fetch({
      limit: Math.min(100, remaining),
      before: lastId,
    });

    if (fetched.size === 0) break;

    messages.push(...fetched.values());
    lastId = fetched.last().id;

    await progressMsg.edit(
      `📥 Fetching messages... ${messages.length} / ${count}`,
    );
  }

  await progressMsg.edit(`✅ Done! Fetched ${messages.length} messages.`);

  return messages;
}

export async function summary100Command(message, count) {
  try {
    const reaction = await message.react("⏳");

    // 1️⃣ Fetch messages
    const msgs = (await fetchMessages(message.channel, count))
      .reverse()
      .map((m) => `**${m.author.username}:** ${m.content || "(no text)"}`)
      .join("\n");

    // 2️⃣ Gemini summarization
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: `Summarize the following Discord conversation in a clean, short, and structured way:\n\n${msgs}`,
      config: {
        temperature: 0.3,
      },
    });

    let finalResult = response.text?.replace(/```/g, "").trim();

    if (!finalResult) throw new Error("Empty Gemini response");

    // 3️⃣ Split & reply
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