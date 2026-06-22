import { getUploadsCollection } from "../config/db.js";

export async function deleteUpload(message, args) {
  if (!message.member.permissions.has("Administrator")) {
    return message.reply("❌ Admin only");
  }

  const hex = args[0];

  if (!hex) {
    return message.reply("Usage: !delete <hex>");
  }

  const collection = getUploadsCollection();

  const result = await collection.deleteOne({
    hex,
  });

  if (result.deletedCount === 0) {
    return message.reply("❌ Hex code not found");
  }

  return message.reply(`✅ Deleted upload: ${hex}`);
}
