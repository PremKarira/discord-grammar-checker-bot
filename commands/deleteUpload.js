import { getUploadsCollection } from "../config/db.js";

export async function deleteUpload(message, args) {
  if (!message.member.permissions.has("Administrator")) {
    return message.reply("❌ Admin only");
  }

  const value = args[0];

  if (!value) {
    return message.reply("Usage: !delete <hex|all>");
  }

  const collection = getUploadsCollection();

  // Delete ALL uploads
  if (value.toLowerCase() === "all") {
    const result = await collection.deleteMany({});

    return message.reply(
      `✅ Deleted ${result.deletedCount} upload(s)`
    );
  }

  // Delete one upload
  const result = await collection.deleteOne({
    hex: value,
  });

  if (result.deletedCount === 0) {
    return message.reply("❌ Hex code not found");
  }

  return message.reply(`✅ Deleted upload: ${value}`);
}