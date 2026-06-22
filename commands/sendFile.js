import { getUpload } from "../config/db.js";

export async function sendFile(message, args) {
  const hex = args[0];

  if (!hex) return message.reply("give hex code");

  const data = await getUpload(hex);

  if (!data) return message.reply("not found");

  await message.channel.send({
    content: `Uploaded by: ${data.username}\nFile: ${data.filename} \nYour file: ${data.url}`,
  });
}
