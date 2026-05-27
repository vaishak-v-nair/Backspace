export default function Footer() {
  return (
    <footer className="border-t border-white/[0.04] py-16 px-6">
      <div className="mx-auto max-w-5xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 border border-white/10">
                <span className="text-xs font-bold text-[#00ff88]">⌫</span>
              </div>
              <span className="text-sm font-semibold">Backspace</span>
            </div>
            <p className="text-sm text-white/30 leading-relaxed max-w-xs">
              Local-first deterministic rollback for AI-assisted coding workflows. 
              Your code never leaves your machine.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-xs uppercase tracking-[0.2em] text-white/30 mb-4">Product</h4>
            <ul className="space-y-3">
              <li><a href="#features" className="text-sm text-white/40 hover:text-white transition-colors">Features</a></li>
              <li><a href="#how-it-works" className="text-sm text-white/40 hover:text-white transition-colors">How it Works</a></li>
              <li><a href="#calculator" className="text-sm text-white/40 hover:text-white transition-colors">Token Calculator</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs uppercase tracking-[0.2em] text-white/30 mb-4">Developers</h4>
            <ul className="space-y-3">
              <li>
                <a href="https://github.com/vaishak-v-nair/backspace" target="_blank" rel="noopener noreferrer" className="text-sm text-white/40 hover:text-white transition-colors">
                  GitHub
                </a>
              </li>
              <li>
                <a href="https://www.npmjs.com/package/backspace-ai" target="_blank" rel="noopener noreferrer" className="text-sm text-white/40 hover:text-white transition-colors">
                  npm
                </a>
              </li>
              <li>
                <a href="#waitlist" className="text-sm text-white/40 hover:text-white transition-colors">
                  Join Waitlist
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-16 pt-8 border-t border-white/[0.04] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/20">
            © {new Date().getFullYear()} Backspace. Built with obsessive attention to developer experience.
          </p>
          <div className="flex items-center gap-1 text-xs text-white/20">
            <span>Made with</span>
            <span className="text-[#00ff88]">♥</span>
            <span>for developers who vibe code</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
