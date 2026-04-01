export type ProjectTemplate = {
  id: string
  name: string
  description: string
  prompt: string
  platform: 'web' | 'mobile' | 'data'
  category: string
  icon: string
}

export const projectTemplates: ProjectTemplate[] = [
  {
    id: 'ecommerce-store',
    name: 'E-commerce Store',
    description: 'Modern online store with product grid, cart, and checkout',
    prompt: 'Build a modern e-commerce store with product grid showing images and prices, shopping cart with add/remove items, checkout form, and responsive design. Use Next.js with Tailwind CSS and shadcn components.',
    platform: 'web',
    category: 'Business',
    icon: '🛍️',
  },
  {
    id: 'fitness-tracker',
    name: 'Fitness Tracker',
    description: 'Mobile app for tracking workouts and progress',
    prompt: 'Build a fitness tracker mobile app with workout logging, progress charts showing weekly stats, daily goals tracker, and bottom tab navigator. Use cards for workouts with exercise name, sets, and reps.',
    platform: 'mobile',
    category: 'Health',
    icon: '💪',
  },
  {
    id: 'social-feed',
    name: 'Social Media Feed',
    description: 'Instagram-style feed with posts, likes, and comments',
    prompt: 'Create a social media feed app with post cards showing images, captions, likes and comments. Include a create post form, user profiles, and infinite scroll. Modern design with gradients.',
    platform: 'web',
    category: 'Social',
    icon: '📱',
  },
  {
    id: 'recipe-finder',
    name: 'Recipe Finder',
    description: 'Search and browse recipes with ingredients and instructions',
    prompt: 'Build a recipe finder app with search bar, ingredient filters, recipe cards with images and cooking time, detailed recipe view with ingredients list and step-by-step instructions. Clean modern design.',
    platform: 'web',
    category: 'Lifestyle',
    icon: '🍳',
  },
  {
    id: 'task-manager',
    name: 'Task Manager',
    description: 'Mobile todo app with categories and reminders',
    prompt: 'Create a task manager mobile app with todo lists, categories, priority levels, due dates, and swipe to complete. Include bottom navigation and clean card-based design.',
    platform: 'mobile',
    category: 'Productivity',
    icon: '✅',
  },
  {
    id: 'quiz-app',
    name: 'Quiz App',
    description: 'Interactive quiz game with scores and leaderboard',
    prompt: 'Build a quiz app mobile game with multiple choice questions, timer, score tracking, progress bar, and results screen with leaderboard. Use colorful cards and smooth animations.',
    platform: 'mobile',
    category: 'Education',
    icon: '🎯',
  },
]

export function getTemplateById(id: string): ProjectTemplate | undefined {
  return projectTemplates.find(t => t.id === id)
}
