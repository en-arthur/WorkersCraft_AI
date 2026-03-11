export function getTemplateIdSuffix(id: string) {
  const isDev = process.env.NODE_ENV === 'development'
  return isDev ? `${id}-dev` : id
}

export function getTemplateId(id: string) {
  return id.replace(/-dev$/, '')
}

const templates = {
  'code-interpreter-v1': {
    name: 'Python',
    lib: [
      'python',
      'jupyter',
      'numpy',
      'pandas',
      'matplotlib',
      'seaborn',
      'plotly',
    ],
    file: 'script.py',
    instructions:
      'Runs code as a Jupyter notebook cell. Strong data analysis angle. Can use complex visualisation to explain results.',
    port: null,
  },
  [getTemplateIdSuffix('nextjs-developer')]: {
    name: 'Next.js',
    lib: [
      'nextjs@14.2.5',
      'typescript',
      '@types/node',
      '@types/react',
      '@types/react-dom',
      'postcss',
      'tailwindcss',
      'shadcn',
    ],
    file: 'pages/index.tsx',
    instructions:
      'A Next.js 13+ app that reloads automatically. Using the pages router.',
    port: 3000,
  },
  [getTemplateIdSuffix('vue-developer')]: {
    name: 'Vue.js',
    lib: ['vue@latest', 'nuxt@3.13.0', 'tailwindcss'],
    file: 'app/app.vue',
    instructions:
      'A Vue.js 3+ app that reloads automatically. Only when asked specifically for a Vue app.',
    port: 3000,
  },
  [getTemplateIdSuffix('streamlit-developer')]: {
    name: 'Streamlit',
    lib: [
      'streamlit',
      'pandas',
      'numpy',
      'matplotlib',
      'requests',
      'seaborn',
      'plotly',
    ],
    file: 'app.py',
    instructions: 'A streamlit app that reloads automatically.',
    port: 8501,
  },
  [getTemplateIdSuffix('gradio-developer')]: {
    name: 'Gradio',
    lib: [
      'gradio',
      'pandas',
      'numpy',
      'matplotlib',
      'requests',
      'seaborn',
      'plotly',
    ],
    file: 'app.py',
    instructions:
      'A gradio app. Gradio Blocks/Interface should be called demo.',
    port: 7860,
  },
  [getTemplateIdSuffix('expo-developer')]: {
    name: 'Expo React Native',
    lib: ['expo', 'react-native', 'react-native-web', 'react', 'react-dom', 'expo-router'],
    file: 'app/index.tsx',
    instructions:
      'An Expo React Native app with Expo Router. Entry file is app/index.tsx. Use React Native components (View, Text, StyleSheet). Avoid native-only APIs.',
    port: 8081,
  },
}

export type Templates = typeof templates
export default templates

export function templatesToPrompt(templates: Templates) {
  return `${Object.entries(templates)
    .map(
      ([id, t], index) =>
        `${index + 1}. ${id}: "${t.instructions}". File: ${t.file || 'none'}. Dependencies installed: ${t.lib.join(', ')}. Port: ${t.port || 'none'}.`,
    )
    .join('\n')}`
}
