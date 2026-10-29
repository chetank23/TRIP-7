'use client';

import React, { useState } from 'react';
import { useTrip } from '@/lib/trip-context';
import { User, ArrowRight } from 'lucide-react';

export function LandingPage() {
  const { setUserName } = useTrip();
  const [nameInput, setNameInput] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nameInput.trim();
    if (!trimmed) {
      setError('Please enter your name to continue');
      return;
    }
    setUserName(trimmed);
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#FEFBF6] px-6 py-12 select-none">
      <div className="w-full max-w-[340px] flex flex-col items-center text-center">
        {/* Top App Squircle Icon */}
        <div className="w-[76px] h-[76px] rounded-[22px] bg-white border border-[#EFE5D8] shadow-[0_4px_16px_rgba(0,0,0,0.03)] flex items-center justify-center mb-4 transition-transform hover:scale-105 overflow-hidden">
          <img
            src="/images/bvc_icon.png"
            alt="BVC Trip"
            className="w-12 h-12 object-contain"
          />
        </div>

        {/* Brand Title */}
        <h2 className="text-xl font-extrabold text-[#1A171D] tracking-tight">
          BVC Trip
        </h2>
        <p className="text-[10px] uppercase font-bold tracking-[0.24em] text-[#8C8278] mt-1.5">
          Explore · Spend · Together
        </p>

        {/* Main Welcome Heading */}
        <div className="mt-14 sm:mt-16 mb-10 text-center">
          <h1 className="text-4xl sm:text-[44px] font-black text-[#1A171D] tracking-tight leading-[1.15]">
            Welcome to
          </h1>
          <h1 className="text-4xl sm:text-[44px] font-black text-[#DD1D32] tracking-tight leading-[1.15] mt-1">
            BVC Trip!
          </h1>
          <p className="text-sm text-[#736B63] font-medium mt-3.5 tracking-tight">
            One trip. One budget. Countless memories.
          </p>
        </div>

        {/* Name Input & Form */}
        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <div>
            <div className="relative rounded-2xl bg-white border border-[#EFE5D8] shadow-[0_2px_8px_rgba(0,0,0,0.02)] px-4 py-3.5 flex items-center focus-within:ring-2 focus-within:ring-[#DD1D32]/20 focus-within:border-[#DD1D32] transition-all">
              <User className="w-5 h-5 text-[#9E958C] mr-3 shrink-0 stroke-[1.8]" />
              <input
                type="text"
                placeholder="Enter your name"
                value={nameInput}
                onChange={(e) => {
                  setNameInput(e.target.value);
                  if (error) setError(null);
                }}
                className="w-full text-base font-medium text-[#1A171D] placeholder:text-[#9E958C] bg-transparent outline-none"
                autoFocus
              />
            </div>
            {error && (
              <p className="text-xs text-[#DD1D32] mt-2 font-medium text-left px-2">
                {error}
              </p>
            )}
          </div>

          {/* Let's Go Button */}
          <div className="pt-1">
            <button
              type="submit"
              className="w-full py-4 rounded-full bg-gradient-to-r from-[#D7192D] to-[#E3263A] hover:from-[#C91326] hover:to-[#D7192D] text-white font-bold text-base shadow-[0_12px_28px_-6px_rgba(221,29,50,0.38)] active:scale-[0.98] transition-all flex items-center justify-center space-x-2"
            >
              <span>Let&apos;s Go</span>
              <ArrowRight className="w-5 h-5 stroke-[2.4]" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
