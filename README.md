# ⚡ Advanced Discord Automation Bot

Discord bot built using **Node.js**, **Discord.js v14**, and **n8n automation**.  
It includes grammar checking, search features, user management, presence tracking, voice alerts, and full error reporting.

---

## 🚀 Features

### ✅ Core Features
- Prefix commands (customizable)
- Slash commands auto-loader
- Grammar checking using n8n workflow
- Search command integrated with n8n (supports gzip / br / deflate)
- Forwarding messages from target users
- Button support (delete button)
- Presence update tracking
- Voice channel activity alerts
- Rate-limited message analysis
- Owner-only tester and target management
- Full error reporting with message jump links

---

## 📁 Project Structure

```
/commands
  ├── *.slash.js
  ├── list.js
  ├── test.js
  ├── check.js
  ├── search.js
  ├── updateTester.js
  ├── updateTarget.js
  └── voiceTargets.js

/utils
  ├── analyzeText.js
  ├── searchText.js
  └── reportError.js

/events
  ├── handleInteractionCreate.js
  ├── handleMessageCreate.js
  ├── handlePresenceUpdate.js
  └── handleVoiceStateUpdate.js

/config
  ├── db.js
```

---

## 🔧 Installation

### 1️⃣ Clone Repository

```sh
git clone https://github.com/your-username/your-bot.git
cd your-bot
```

### 2️⃣ Install Dependencies

```sh
npm install
```

### 3️⃣ Create a `.env` File

```env
TOKEN=your_bot_token
CLIENT_ID=your_client_id
OWNER_ID=your_discord_id
PREFIX=!

# n8n
N8N_WEBHOOK_URL=https://your-n8n-workflow
N8N_SEARCH_WEBHOOK_URL=https://your-n8n-search-workflow
N8N_AUTH_HEADER=your-api-key

# Channels
SUPPORT_CHANNEL_ID=1234567890
ERROR_REPORT_CHANNEL=1234567890
```

---

## 💬 Prefix Commands

| Command | Who can use | Description |
|--------|-------------|-------------|
| `!list` | Owner / Tester | Show testers & targets |
| `!0` | Owner / Tester | Toggle bot ON/OFF |
| `!addtester <id>` | Owner | Add tester |
| `!removetester <id>` | Owner | Remove tester |
| `!addtarget <id>` | Owner | Add user to monitor |
| `!removetarget <id>` | Owner | Remove monitored user |
| `!addvoicetarget <id>` | Owner | Add VC alert target |
| `!removevoicetarget <id>` | Owner | Remove VC alert target |
| `!test <text>` | All | Test grammar logic |
| `!check` | All | Quick grammar check |
| `!search <text>` | All | Search via n8n |
| `!summary <N>` | All | Summarize N messages via n8n |

---

## 🧩 Slash Commands

Slash commands are auto-loaded from `commands/*.slash.js`.

Every slash command file should export:

```js
export default {
  name: "command",
  description: "description",
  async execute(interaction) {}
};
```

Invalid command files are skipped automatically.

---

## 🛠️ Event Handlers

### 📌 handleMessageCreate
- Applies prefix logic  
- Forwards monitored users  
- Sends grammar checks  
- Processes test/search/list commands  

### 📌 handleInteractionCreate
- Slash commands  
- Delete message button  

### 📌 handlePresenceUpdate
Sends a message when tracked users change custom status (with delete button).

### 📌 handleVoiceStateUpdate
Sends alert when voice targets join VC (auto-deletes after 20 sec).

---

## 🌐 n8n Integration

### Grammar Check Workflow
Bot sends:

```json
{
  "text_to_analyze": "...",
  "mode": "Grammar correction template"
}
```

Workflow must return:

```
good
same sentence
```

or

```
bad
corrected sentence
```

---

### Search Workflow
Expected return:

```json
{
  "final_result": "your final text"
}
```

Supports:

- br (Brotli)
- gzip
- deflate

---

## 🔥 Error Handling

Errors are reported to `ERROR_REPORT_CHANNEL` with:

- Error name & stack
- User information
- Channel details
- "Jump to message" link
- JSON payload sent to webhook

---

## 🧑‍💻 Run the Bot

### Development

```sh
node index.js
```

### Production (pm2 recommended)

```sh
pm2 start index.js --name discord-bot
```

---

## 🤝 Contributing

Pull requests are welcome. Please follow existing code structure.

---
