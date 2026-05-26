'use client';

import { useUser, SignIn, useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { joinWaitlist } from '../actions/join';

export default function JoinPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  const [status, setStatus] = null as any; // We'll use proper state below
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      processWaitlist();
    }
  }, [isLoaded, isSignedIn, user]);

  const processWaitlist = async () => {
    setMessage('Authenticating and securing your beta key...');
    try {
      const email = user?.primaryEmailAddress?.emailAddress;
      if (!email) throw new Error('No email found.');

      // 1. Insert to Supabase Waitlist
      const res = await joinWaitlist(email);

      setMessage('Success! Redirecting back to CLI...');

      // 2. Get secure JWT token
      const token = await getToken();

      // 3. Redirect back to local CLI
      setTimeout(() => {
        window.location.href = \`http://localhost:8080/callback?token=\${token || res.betaKey}\`;
      }, 1500);

    } catch (err: any) {
      console.error(err);
      setMessage('Error joining waitlist: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] p-6">
      <div className="w-full max-w-md relative z-10">
        
        {/* Glow Effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-white/10 to-white/5 rounded-[2rem] blur-xl opacity-50"></div>
        
        <div className="relative bg-[#0A0A0A] border border-white/10 rounded-[2rem] p-10 overflow-hidden backdrop-blur-xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-mono font-medium tracking-tighter text-white mb-2">
              ⌫ Backspace
            </h1>
            <p className="text-white/50 text-sm">Join the deterministic AI coding waitlist.</p>
          </div>

          {!isLoaded ? (
            <div className="text-center text-white/50 animate-pulse">Loading secure environment...</div>
          ) : !isSignedIn ? (
            <div className="flex justify-center cluma-signin-wrapper">
              <SignIn 
                appearance={{
                  elements: {
                    rootBox: "w-full",
                    card: "bg-transparent border-0 shadow-none w-full",
                    headerTitle: "hidden",
                    headerSubtitle: "hidden",
                    socialButtonsBlockButton: "bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all",
                    socialButtonsBlockButtonText: "text-white font-medium",
                    formButtonPrimary: "bg-white text-black hover:bg-gray-200 transition-all font-medium",
                    formFieldInput: "bg-white/5 border border-white/10 text-white focus:border-white/30 transition-all",
                    formFieldLabel: "text-white/70",
                    footerActionText: "text-white/50",
                    footerActionLink: "text-white hover:text-white/80"
                  }
                }}
              />
            </div>
          ) : (
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 text-green-500 mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-white/80 font-medium">{message}</p>
              <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mt-6">
                <div className="h-full bg-white animate-[pulse_1.5s_ease-in-out_infinite] w-full rounded-full"></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
