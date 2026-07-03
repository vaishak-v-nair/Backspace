export default function Footer() {
  return (
    <footer className="border-t border-[#2a2520] py-8 px-6">
      <div className="mx-auto max-w-[1200px] flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Left: brand */}
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-medium text-[#8a7f72]">BACKSPACE</span>
          <span className="text-[10px] text-[#5c5347]">· v0.1.0</span>
        </div>

        {/* Center: links */}
        <div className="flex items-center gap-5 text-[11px] text-[#5c5347]">
          <a href="#features" className="hover:text-[#c8bfb0] transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-[#c8bfb0] transition-colors">Workflow</a>
          <a href="https://www.npmjs.com/package/backspace-ai" target="_blank" rel="noopener noreferrer"
            className="hover:text-[#c8bfb0] transition-colors">npm</a>
          <a href="https://github.com/vaishak-v-nair/Backspace" target="_blank" rel="noopener noreferrer"
            className="hover:text-[#c8bfb0] transition-colors">GitHub</a>
        </div>

        {/* Right: copyright + motto */}
        <div className="flex items-center gap-3 text-[10px] text-[#5c5347]">
          <span>© {new Date().getFullYear()}</span>
          <span className="serif-accent text-[11px]">why debug when you can revert.</span>
        </div>
      </div>
    </footer>
  );
}
