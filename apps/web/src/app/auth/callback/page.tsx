"use client";

import { useEffect, useState } from "react";

export default function AuthCallbackPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Simulate authenticating and generating a token
    const generateToken = async () => {
      // Wait a moment for dramatic effect / simulate network request
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      const generatedToken = "backspace_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      setToken(generatedToken);

      try {
        // Ping the local CLI server to see if it's running before redirecting
        // We use no-cors to avoid CORS preflight issues with localhost
        await fetch(`http://localhost:8080/callback?token=${generatedToken}`, {
          method: "GET",
          mode: "no-cors",
        });
        
        // If the fetch doesn't throw, the CLI is likely running.
        // Redirect the browser so the CLI can serve its own success page.
        window.location.href = `http://localhost:8080/callback?token=${generatedToken}`;
        setStatus("success");
      } catch {
        // Fetch threw an error, meaning the CLI server is not running or unreachable
        setStatus("error");
      }
    };

    generateToken();
  }, []);

  const handleCopy = async () => {
    if (token) {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-foreground font-sans">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-2xl">
        
        {/* Logo / Icon Header */}
        <div className="mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 text-accent border border-accent/20">
            {status === "loading" ? (
              <svg className="h-8 w-8 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : status === "success" ? (
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="text-center">
          {status === "loading" && (
            <>
              <h2 className="text-xl font-semibold tracking-tight mb-2">Authorizing Backspace CLI...</h2>
              <p className="text-sm text-muted">Please wait while we generate your secure token.</p>
            </>
          )}

          {status === "success" && (
            <>
              <h2 className="text-xl font-semibold tracking-tight mb-2">Redirecting...</h2>
              <p className="text-sm text-muted">Sending you back to the terminal.</p>
            </>
          )}

          {status === "error" && token && (
            <div className="animate-in fade-in zoom-in duration-300">
              <h2 className="text-xl font-semibold tracking-tight mb-2">Manual Verification Required</h2>
              <p className="text-sm text-muted mb-6">
                We could not automatically redirect you. The Backspace CLI server might not be running. 
                Please copy the token below and paste it into your terminal.
              </p>

              <div className="relative group">
                <div className="flex items-center justify-between rounded-xl border border-code-border bg-code-bg px-4 py-3 font-mono text-sm">
                  <span className="truncate mr-4 text-accent-light">{token}</span>
                  <button
                    onClick={handleCopy}
                    className="flex-shrink-0 flex items-center gap-1.5 rounded-md bg-accent/20 hover:bg-accent/30 px-3 py-1.5 text-xs font-medium text-accent transition-colors"
                  >
                    {copied ? (
                      <>
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        Copied
                      </>
                    ) : (
                      <>
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                        Copy Token
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
