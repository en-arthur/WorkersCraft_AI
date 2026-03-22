export const changelog = [
  {
    version: '1.2.0',
    date: '2026-03-22',
    changes: [
      { type: 'new', text: 'Mobile preview with phone shell (bezel + notch)' },
      { type: 'new', text: 'Google Sans font across the platform' },
      { type: 'new', text: 'Changelog page' },
      { type: 'improvement', text: 'URL bar in preview hidden until hovered' },
      { type: 'improvement', text: 'Import GitHub and New Project buttons moved to top of dashboard' },
      { type: 'improvement', text: 'Tech stack selector uses actual logos instead of emojis' },
      { type: 'fix', text: 'React error #185 on follow-up messages' },
      { type: 'fix', text: 'Replaced all alert() calls with toasts' },
      { type: 'fix', text: 'Auto-save now shows success/failure feedback' },
    ],
  },
  {
    version: '1.1.0',
    date: '2026-03-19',
    changes: [
      { type: 'new', text: 'Paddle subscription billing integration' },
      { type: 'new', text: 'GitHub OAuth with workflow scope' },
      { type: 'improvement', text: 'Streaming error recovery with user-facing messages' },
      { type: 'fix', text: 'AI commentary was generic — now uses AI-generated text' },
      { type: 'fix', text: 'Paddle subscription not activating after payment' },
    ],
  },
  {
    version: '1.0.0',
    date: '2026-03-16',
    changes: [
      { type: 'new', text: 'AI-powered app builder with Next.js, Streamlit, and Expo templates' },
      { type: 'new', text: 'Real-time code streaming with Vercel AI SDK' },
      { type: 'new', text: 'E2B sandbox preview' },
      { type: 'new', text: 'Project save and conversation history' },
    ],
  },
]
