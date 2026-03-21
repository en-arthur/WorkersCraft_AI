# WorkersCraft AI

**Build full-stack web and mobile apps with AI — from idea to deployment in minutes.**

WorkersCraft AI is an AI-powered platform that generates, edits, and deploys production-ready applications. Describe what you want to build in natural language, and get a complete app with frontend, backend, and deployment pipeline.

[→ Try it now at workerscraftai.com](https://workerscraftai.com)

---

## Features

- **AI-powered code generation** — Build apps using natural language prompts
- **Multi-file project support** — Generate complex apps with proper file structure
- **Intelligent code editing** — Follow-up iterations using Morph Apply for precise edits
- **Live preview** — See your app running in real-time via E2B sandboxes
- **Backend included** — Every app gets auth, storage, and file uploads via WorkersCraft Cloud
- **GitHub integration** — Push code directly to your repos
- **Mobile builds** — Generate Android APKs and AABs via GitHub Actions
- **One-click deployment** — Deploy to Vercel with a single click
- **Multiple LLM providers** — OpenAI, Anthropic, Google AI, Mistral, Groq, and more

---

## Tech Stack

- **Frontend:** Next.js 14 (App Router), React, TailwindCSS, shadcn/ui
- **Backend:** Supabase (auth, database), WorkersCraft Cloud (BaaS)
- **AI:** Vercel AI SDK, Morph Apply
- **Sandboxes:** E2B for secure code execution
- **Payments:** Paddle
- **Analytics:** PostHog

---

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- [E2B API Key](https://e2b.dev)
- LLM Provider API Key (OpenAI, Anthropic, etc.)
- [Supabase Project](https://supabase.com)

### 1. Clone and Install

```bash
git clone https://github.com/en-arthur/WorkersCraft_AI.git
cd WorkersCraft_AI
npm install
```

### 2. Set Environment Variables

Create a `.env.local` file:

```bash
# E2B (required)
E2B_API_KEY=your-e2b-api-key

# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# LLM Providers (at least one required)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_AI_API_KEY=

# Morph Apply (optional, for better code editing)
MORPH_API_KEY=

# Encryption (required for production)
ENCRYPTION_KEY=your-32-char-random-string

# Paddle (optional, for billing)
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=
PADDLE_API_KEY=
NEXT_PUBLIC_PADDLE_STARTER_PRICE_ID=
NEXT_PUBLIC_PADDLE_PRO_PRICE_ID=
NEXT_PUBLIC_PADDLE_MAX_PRICE_ID=

# PostHog (optional, for analytics)
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=
```

### 3. Set Up Database

Run the SQL migrations in `supabase_migrations.sql` in your Supabase SQL editor.

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deployment

### Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/en-arthur/WorkersCraft_AI)

1. Click the button above
2. Add all environment variables from `.env.local`
3. Deploy

---

## Project Structure

```
app/
├── api/              # API routes (chat, deploy, projects, etc.)
├── chat/             # Main chat interface
├── dashboard/        # User dashboard and billing
├── cloud/            # WorkersCraft Cloud landing page
└── terms/            # Terms of service

components/
├── ui/               # shadcn/ui components
├── landing/          # Landing page components
└── *.tsx             # Feature components (preview, navbar, etc.)

lib/
├── models.json       # LLM model configurations
├── templates.json    # App templates (Next.js, Vue, Expo, etc.)
├── schema.ts         # Zod schemas for AI responses
└── *.ts              # Utilities (auth, morph, messages, etc.)
```

---

## Features in Detail

### AI Code Generation

- Supports multiple templates: Next.js, Vue, Streamlit, Gradio, Expo
- Generates multi-file projects with proper structure
- Installs npm/pip dependencies automatically

### Code Editing (Morph Apply)

- Intelligent follow-up iterations
- Only edits relevant files (not full regeneration)
- Falls back gracefully if patch fails

### WorkersCraft Cloud (Backend)

- Auto-provisioned backend for every app
- User authentication and sessions
- NoSQL-style storage collections
- File uploads with CDN delivery
- Admin panel in dashboard

### Mobile Builds

- Android Debug (APK) and Release (AAB)
- iOS builds (coming soon)
- Automated via GitHub Actions
- Keystore generation for Android signing

---

## Contributing

Contributions are welcome! Please open an issue or PR.

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

## Support

- Email: workerscraftai@gmail.com
- GitHub Issues: [github.com/en-arthur/WorkersCraft_AI/issues](https://github.com/en-arthur/WorkersCraft_AI/issues)

---

Built with ❤️ by the WorkersCraft AI team
