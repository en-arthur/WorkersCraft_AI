export default function sitemap() {
  const base = process.env.NEXT_PUBLIC_SITE_URL
  return [
    { url: base, lastModified: new Date(), changeFrequency: 'monthly', priority: 1 },
    { url: `${base}/billing`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/auth`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.5 },
  ]
}
