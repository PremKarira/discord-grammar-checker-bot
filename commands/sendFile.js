import { getUpload } from "../config/db.js";

export async function sendFile(message, args) {
  const hex = args[0];

  if (!hex) {
    return message.reply("❌ Give hex code");
  }

  const data = await getUpload(hex);

  if (!data) {
    return message.reply("❌ Upload not found");
  }

  const parts = data.parts || [];

  if (!parts.length) {
    return message.reply("❌ No file parts found");
  }

  // Send file information
  await message.channel.send({
    content:
      `📁 ${data.filename}\n` +
      `👤 Uploaded by: ${data.username}\n` +
      `📦 Parts: ${parts.length}`,
  });

  // Send each part separately
  for (let i = 0; i < parts.length; i++) {
    await message.channel.send({
      content:
        `▶️ Part ${i + 1}/${parts.length}\n` +
        parts[i],
    });
  }
}