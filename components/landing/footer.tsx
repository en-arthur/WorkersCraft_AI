import { Github, Twitter } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-3 gap-8">
          <div>
            <h3 className="font-semibold mb-4">Fragments by E2B</h3>
            <p className="text-sm text-muted-foreground">
              Open-source AI-powered app builder with secure code execution
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4">Resources</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="https://github.com/e2b-dev/fragments" className="text-muted-foreground hover:text-foreground">
                  Documentation
                </a>
              </li>
              <li>
                <a href="https://e2b.dev" className="text-muted-foreground hover:text-foreground">
                  E2B Platform
                </a>
              </li>
              <li>
                <a href="https://github.com/e2b-dev/code-interpreter" className="text-muted-foreground hover:text-foreground">
                  E2B SDK
                </a>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4">Community</h3>
            <div className="flex gap-4">
              <a href="https://github.com/e2b-dev/fragments" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                <Github className="w-5 h-5" />
              </a>
              <a href="https://x.com/e2b" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                <Twitter className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
        
        <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} E2B. Open source under MIT License.
        </div>
      </div>
    </footer>
  )
}
