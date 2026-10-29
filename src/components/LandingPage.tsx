'use client';

import React, { useState } from 'react';
import { useTrip } from '@/lib/trip-context';
import { Palmtree, User, ArrowRight, Plane } from 'lucide-react';

const SUGGESTED_NAMES = ['Chetan', 'Rahul', 'Priya', 'Aakash', 'Rohan', 'Neha', 'Sneha'];

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

  const handleSelectSuggested = (name: string) => {
    setNameInput(name);
    setError(null);
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between bg-[#FBF5EC] overflow-hidden">
      {/* Background travel landscape and soft sunset gradient */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#FFFDF9] via-[#FBF5EC]/90 to-[#F6EDE2]" />
        
        {/* Decorative warm sun glow */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-gradient-to-b from-[#FFC49B]/30 to-[#F34D55]/10 blur-3xl" />

        {/* Coastal silhouette illustration graphic */}
        <div
          className="absolute bottom-0 left-0 right-0 h-64 bg-cover bg-bottom opacity-75"
          style={{
            backgroundImage: "url('/images/landing_friends.png')",
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center bottom',
          }}
        />
      </div>

      {/* Top Header / Brand Area */}
      <div className="relative z-10 pt-12 px-6 flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-2xl bg-white border border-cream-300 shadow-card flex items-center justify-center text-bvc-red mb-3">
          <Palmtree className="w-8 h-8 stroke-[2]" />
        </div>
        <h2 className="text-xl font-extrabold text-bvc-text tracking-tight">BVC Trip</h2>
        <p className="text-[10px] uppercase font-bold tracking-[0.25em] text-bvc-secondary mt-1">
          Explore · Spend · Together
        </p>
      </div>

      {/* Center Welcome & Name Entry Card */}
      <div className="relative z-10 px-6 max-w-md w-full mx-auto my-auto py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-bvc-text tracking-tight leading-tight">
            Welcome to <span className="text-bvc-red">BVC Trip!</span>
          </h1>
          <p className="text-sm text-bvc-secondary mt-2 font-medium">
            One trip. One budget. Countless memories.
          </p>
        </div>

        {/* Name input form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="relative rounded-2xl bg-white border border-cream-300 shadow-card px-4 py-3.5 flex items-center focus-within:ring-2 focus-within:ring-bvc-red/20 focus-within:border-bvc-red transition-all">
              <User className="w-5 h-5 text-bvc-secondary mr-3 shrink-0" />
              <input
                type="text"
                placeholder="Enter your name"
                value={nameInput}
                onChange={(e) => {
                  setNameInput(e.target.value);
                  if (error) setError(null);
                }}
                className="w-full text-base font-semibold text-bvc-text placeholder:text-bvc-muted bg-transparent outline-none"
                autoFocus
              />
            </div>
            {error && (
              <p className="text-xs text-bvc-error mt-2 font-medium px-2">{error}</p>
            )}
          </div>

          {/* Quick select chip pills */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
            <span className="text-[11px] text-bvc-secondary mr-1">Quick select:</span>
            {SUGGESTED_NAMES.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => handleSelectSuggested(name)}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all ${
                  nameInput === name
                    ? 'bg-bvc-red text-white border-bvc-red'
                    : 'bg-white/80 border-cream-300 text-bvc-secondary hover:border-bvc-red hover:text-bvc-red'
                }`}
              >
                {name}
              </button>
            ))}
          </div>

          {/* Let's Go Button */}
          <div className="pt-3">
            <button
              type="submit"
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-bvc-deepRed to-bvc-red hover:from-bvc-red hover:to-bvc-redHighlight text-white font-bold text-base shadow-redGlow active:scale-[0.99] transition-all flex items-center justify-center space-x-2"
            >
              <span>Let&apos;s Go</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>

      {/* Bottom Script Signature & Airplane Trail Accent */}
      <div className="relative z-10 pb-8 px-6 flex items-center justify-between max-w-md w-full mx-auto">
        <div className="text-left">
          <p className="font-script text-2xl sm:text-3xl text-bvc-deepRed leading-tight -rotate-2 select-none drop-shadow-sm">
            Same people Different places
          </p>
          <p className="font-script text-xl text-bvc-red pl-6 -mt-1 select-none">
            BVC ♡
          </p>
        </div>

        <div className="flex items-center space-x-1 text-bvc-secondary opacity-75">
          <div className="border-t-2 border-dashed border-bvc-peach w-16" />
          <Plane className="w-5 h-5 text-bvc-red -rotate-45" />
        </div>
      </div>
    </div>
  );
}
