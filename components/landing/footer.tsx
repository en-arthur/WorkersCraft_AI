import Link from 'next/link'

export function Footer() {
  return (
    <footer className="border-t py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div>
            <p className="font-semibold mb-3">Product</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/cloud" className="hover:text-foreground transition-colors">Cloud</Link></li>
              <li><Link href="/#features" className="hover:text-foreground transition-colors">Features</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-3">Developers</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/auth" className="hover:text-foreground transition-colors">Get Started</Link></li>
              <li><Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-3">Company</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/about" className="hover:text-foreground transition-colors">About</Link></li>
              <li><Link href="/changelog" className="hover:text-foreground transition-colors">Changelog</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-3">Legal</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="font-semibold">WorkersCraft AI</span>
          <span className="text-sm text-muted-foreground">© {new Date().getFullYear()} All rights reserved</span>
        </div>
      </div>
    </footer>
  )
}
