export async function setPresenceCommand(client, message, args) {
  if (!args.length) {
    return message.reply(
      "❌ Usage:\n" +
        "`set playing hi`\n" +
        "`set watching anime`\n" +
        "`set listening music`\n" +
        "`set streaming live https://twitch.tv/xyz`",
    );
  }

  const typeMap = {
    playing: 0,
    streaming: 1,
    listening: 2,
    watching: 3,
    competing: 5,
  };

  const typeInput = args[0].toLowerCase();
  const activityType = typeMap[typeInput] ?? 0;

  let name = "";
  let url;

  if (activityType === 1) {
    // streaming case
    url = args[args.length - 1];
    name = args.slice(1, -1).join(" ");

    if (!url.startsWith("http")) {
      return message.reply("❌ Streaming requires valid URL");
    }
  } else {
    name = args.slice(1).join(" ");
  }

  if (!name) {
    return message.reply("❌ Provide activity text");
  }

  try {
    await client.user.setPresence({
      activities: [
        {
          name,
          type: activityType,
          url,
        },
      ],
      status: "online",
    });

    await message.reply(`✅ Presence set to **${typeInput} ${name}**`);
  } catch (err) {
    console.error(err);
    await message.reply("❌ Failed to update presence");
  }
}
