# Slack & Telegram Bot Integration

Manage your WorkersCraft AI projects directly from Slack and Telegram with interactive buttons.

## Features

- 📁 **Project Management** - List, create, and delete projects
- 🚀 **One-Click Deployment** - Deploy to Vercel with button clicks
- 📊 **Project Status** - Check deployment status and analytics
- ⚙️ **Settings** - Configure project settings
- 🔘 **Button-Driven** - No commands to memorize, just click buttons

## Setup

### Slack App

#### 1. Create Slack App

1. Go to https://api.slack.com/apps
2. Click "Create New App" → "From scratch"
3. Name: "WorkersCraft AI"
4. Choose your workspace
5. Click "Create App"

#### 2. Configure OAuth & Permissions

1. Go to "OAuth & Permissions"
2. Add Redirect URL: `https://your-domain.com/api/integrations/slack/callback`
3. Add Bot Token Scopes:
   - `chat:write`
   - `commands`
   - `users:read`
4. Add User Token Scopes:
   - `chat:write`
5. Save Changes

#### 3. Configure Slash Commands

1. Go to "Slash Commands"
2. Click "Create New Command"
3. Command: `/workerscraft`
4. Request URL: `https://your-domain.com/api/integrations/slack/events`
5. Short Description: "Manage WorkersCraft AI projects"
6. Usage Hint: `list | new | deploy <project> | status <project> | help`
7. Save

#### 4. Configure Interactivity

1. Go to "Interactivity & Shortcuts"
2. Turn on Interactivity
3. Request URL: `https://your-domain.com/api/integrations/slack/events`
4. Save Changes

#### 5. Get Credentials

1. Go to "Basic Information"
2. Copy "Signing Secret"
3. Go to "OAuth & Permissions"
4. Copy "Client ID" and "Client Secret"

#### 6. Configure Environment Variables

Add to `.env.local`:

```bash
SLACK_CLIENT_ID=your_client_id
SLACK_CLIENT_SECRET=your_client_secret
SLACK_SIGNING_SECRET=your_signing_secret
SLACK_REDIRECT_URI=https://your-domain.com/api/integrations/slack/callback
```

#### 7. Link Your Account

1. Go to `https://your-domain.com/dashboard/integrations`
2. Click "Connect to Slack"
3. Authorize the app
4. Done! Your account is linked

### Telegram Bot

#### 1. Create Bot with BotFather

1. Open Telegram and search for `@BotFather`
2. Send `/newbot`
3. Follow the prompts to create your bot
4. Save the bot token

#### 2. Configure Environment Variables

Add to `.env.local`:

```bash
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_WEBHOOK_SECRET=your_random_secret_here
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

Generate a random secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### 3. Set Up Webhook

Run the setup script:

```bash
node scripts/setup-telegram-bot.js
```

This will:
- Verify your bot token
- Set up the webhook URL
- Configure allowed updates
- Display bot information

#### 4. Link Your Account

1. Go to `https://your-domain.com/dashboard/integrations`
2. Click "Connect Telegram"
3. Copy the 6-digit verification code
4. Open your bot in Telegram
5. Send `/start <code>`
6. Done! Your account is linked

### Slack App (Coming Soon)

Slack integration will be added in a future update.

## Usage

### Telegram Commands

- `/list` - Show all your projects
- `/new` - Create a new project
- `/deploy <project>` - Deploy a project
- `/status <project>` - Get project status
- `/help` - Show all commands

### Button Actions

Most actions can be done with buttons:

- **🚀 Deploy** - Deploy project to Vercel
- **👁️ View Site** - Open deployed site
- **🌐 Open** - Open project in web dashboard
- **⚙️ Settings** - Configure project settings
- **🗑️ Delete** - Delete project
- **➕ Create New** - Start project creation wizard

## Architecture

```
User (Telegram/Slack)
    ↓
Webhook Handler
    ↓
Bot Command/Action Router
    ↓
WorkersCraft Core Services
    ↓
Database (Supabase)
```

### Key Components

- **`/api/integrations/telegram/webhook`** - Receives Telegram updates
- **`/api/bot/command`** - Handles slash commands
- **`/api/bot/action`** - Handles button clicks
- **`lib/bot/buttons.js`** - Button system
- **`lib/bot/telegram-formatter.js`** - Message formatting
- **`components/telegram-integration.js`** - UI component

## Database Schema

### Tables

- **`user_integrations`** - Stores linked accounts
- **`bot_sessions`** - Manages conversation context
- **`bot_interactions`** - Logs all interactions
- **`pending_verifications`** - Temporary verification codes
- **`notification_preferences`** - User notification settings

## Security

- ✅ Webhook signature verification
- ✅ Encrypted tokens in database
- ✅ User authentication required
- ✅ Rate limiting (coming soon)
- ✅ Verification code expiration (15 minutes)

## Troubleshooting

### Bot not responding

1. Check webhook status:
   ```bash
   curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo
   ```

2. Verify environment variables are set

3. Check server logs for errors

### Verification code expired

Codes expire after 15 minutes. Generate a new one from the dashboard.

### Account not linked error

Make sure you've completed the verification flow:
1. Generate code in dashboard
2. Send `/start <code>` to bot
3. Wait for confirmation

## Development

### Testing Locally

1. Use ngrok to expose local server:
   ```bash
   ngrok http 3000
   ```

2. Update webhook URL:
   ```bash
   NEXT_PUBLIC_SITE_URL=https://your-ngrok-url.ngrok.io node scripts/setup-telegram-bot.js
   ```

3. Test commands in Telegram

### Adding New Commands

1. Add command handler in `/api/bot/command/route.js`
2. Add button action in `/api/bot/action/route.js`
3. Update help text

### Adding New Buttons

1. Define action in `lib/bot/buttons.js`
2. Add handler in `/api/bot/action/route.js`
3. Format message in formatter files

## Roadmap

- [x] Telegram integration
- [x] Button-driven UI
- [x] Project management
- [x] Deployment support
- [x] Slack integration
- [x] Notifications
- [x] Scheduled deployments (database storage)
- [ ] Voice commands (Telegram)
- [ ] File uploads
- [ ] Team collaboration

## Support

For issues or questions:
- Open an issue on GitHub
- Contact support@workerscraft.ai
- Check documentation at https://workerscraft.ai/docs
