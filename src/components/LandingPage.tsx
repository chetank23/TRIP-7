'use client';

import React, { useState, useEffect } from 'react';
import { useTrip } from '@/lib/trip-context';
import { User, ArrowRight } from 'lucide-react';
import { FRIEND_PROFILES, findProfileByName, FriendProfile } from '@/lib/profiles';
import { InstallAppButton } from '@/components/InstallAppButton';

const DEFAULT_QUICK_MEMBERS = [
  'Chetan K',
  'Adithi',
  'Harshitha',
  'Dharma',
  'Lavanya',
  'Rohith',
  'Vyshnavi',
];

export function LandingPage() {
  const { setUserName, state } = useTrip();
  const [nameInput, setNameInput] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Profile showcase states
  const [activeSlide, setActiveSlide] = useState<number>(0);
  const [selectedProfile, setSelectedProfile] = useState<FriendProfile | null>(null);
  const [imageErrorMap, setImageErrorMap] = useState<Record<string, boolean>>({});

  const memberList =
    state?.members && state.members.length > 0 ? state.members : DEFAULT_QUICK_MEMBERS;

  // Preload Cloudinary profile images on mount for instant zero-lag transitions
  useEffect(() => {
    FRIEND_PROFILES.forEach((profile) => {
      if (typeof window !== 'undefined') {
        const img = new window.Image();
        img.src = profile.photoUrl;
      }
    });
  }, []);

  // Default automatic 1.5-second horizontal slideshow (active when no profile is selected)
  useEffect(() => {
    if (selectedProfile) return;

    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % FRIEND_PROFILES.length);
    }, 1500);

    return () => clearInterval(interval);
  }, [selectedProfile]);

  // Handle manual input typing with case-insensitive matching
  const handleInputChange = (val: string) => {
    setNameInput(val);
    if (error) setError(null);

    const matched = findProfileByName(val);
    setSelectedProfile(matched);
  };

  // Handle Quick Pick chip clicks
  const handleSelectMember = (member: string) => {
    const matched = findProfileByName(member);
    const canonical = matched ? matched.name : member;
    setNameInput(canonical);
    setSelectedProfile(matched);
    if (error) setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nameInput.trim();
    if (!trimmed) {
      setError('Please enter your name to continue');
      return;
    }
    const matched = findProfileByName(trimmed);
    const finalName = matched ? matched.name : trimmed;
    setUserName(finalName);
  };

  // Determine currently visible profile: selected profile overrides slideshow
  const currentProfile = selectedProfile || FRIEND_PROFILES[activeSlide] || FRIEND_PROFILES[0];

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#FEFBF6] px-6 py-10 sm:py-14 select-none">
      <div className="w-full max-w-[350px] flex flex-col items-center text-center">
        {/* Brand Title & Tagline */}
        <div className="mb-4 sm:mb-6">
          <h2 className="text-2xl font-black text-[#1A171D] tracking-tight">
            BVC Trip
          </h2>
          <p className="text-[10px] uppercase font-bold tracking-[0.24em] text-[#8C8278] mt-1.5">
            Explore · Spend · Together
          </p>
        </div>

        {/* Dedicated Photo Showcase */}
        <div className="flex flex-col items-center">
          {/* Rounded Portrait Card - Ample Size */}
          <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-[32px] sm:rounded-[36px] bg-white border-4 border-white shadow-[0_12px_28px_rgba(0,0,0,0.07)] overflow-hidden flex items-center justify-center transition-all duration-300">
            {currentProfile && (
              <img
                key={currentProfile.name}
                src={currentProfile.photoUrl}
                alt={`${currentProfile.name} profile portrait`}
                className="w-full h-full object-cover object-top transition-opacity duration-300 animate-in fade-in select-none pointer-events-none"
                loading="eager"
                onError={() => {
                  setImageErrorMap((prev) => ({ ...prev, [currentProfile.name]: true }));
                }}
              />
            )}

            {/* Fallback avatar if Cloudinary image fails to load */}
            {currentProfile && imageErrorMap[currentProfile.name] && (
              <div className="absolute inset-0 bg-gradient-to-tr from-[#DD1D32] to-[#FF7A8A] text-white flex items-center justify-center font-extrabold text-3xl">
                {currentProfile.initials}
              </div>
            )}

            {/* Subtle name badge during automatic slideshow */}
            {!selectedProfile && currentProfile && (
              <div className="absolute bottom-2 inset-x-3 text-center pointer-events-none">
                <span className="inline-block px-3 py-0.5 rounded-full bg-black/55 backdrop-blur-sm text-[11px] font-bold text-white tracking-wide truncate max-w-full">
                  {currentProfile.name === 'Vyshnavi' ? 'Vyshnavi · WE MISS YOU VYSHH ❤️' : currentProfile.name}
                </span>
              </div>
            )}
          </div>

          {/* Status Area: Personalized Message Pill or 7 Pagination Dots */}
          <div className="h-8 mt-3 flex items-center justify-center">
            {selectedProfile ? (
              /* Playful Personalized Message Pill */
              <div
                key={selectedProfile.name}
                className="animate-in fade-in slide-in-from-bottom-2 duration-300 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white border border-[#EFE5D8] shadow-[0_3px_10px_rgba(0,0,0,0.04)] text-xs font-bold text-[#1A171D]"
              >
                <span>{selectedProfile.message}</span>
              </div>
            ) : (
              /* Automatic Slideshow 7 Pagination Dots */
              <div className="flex items-center space-x-1.5 py-1">
                {FRIEND_PROFILES.map((p, idx) => {
                  const isActive = idx === activeSlide;
                  return (
                    <button
                      key={p.name}
                      type="button"
                      aria-label={`Slide ${p.name}`}
                      onClick={() => setActiveSlide(idx)}
                      className={`transition-all duration-300 rounded-full ${
                        isActive
                          ? 'w-4 h-1.5 bg-[#DD1D32]'
                          : 'w-1.5 h-1.5 bg-[#E5DCD0] hover:bg-[#C9BCAD]'
                      }`}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Main Welcome Heading */}
        <div className="mt-5 sm:mt-6 mb-8 sm:mb-10 text-center">
          <h1 className="text-3xl sm:text-[38px] font-black text-[#1A171D] tracking-tight leading-[1.12]">
            Welcome to
          </h1>
          <h1 className="text-3xl sm:text-[38px] font-black text-[#DD1D32] tracking-tight leading-[1.12] mt-0.5">
            BVC Trip!
          </h1>
          <p className="text-xs sm:text-sm text-[#736B63] font-medium mt-2 tracking-tight">
            One trip. One budget. Countless memories.
          </p>
        </div>

        {/* Name Input & Form - Moved down with ample breathing room */}
        <form onSubmit={handleSubmit} className="w-full space-y-5">
          <div>
            <div className="relative rounded-2xl bg-white border border-[#EFE5D8] shadow-[0_2px_10px_rgba(0,0,0,0.03)] px-4 py-4 flex items-center focus-within:ring-2 focus-within:ring-[#DD1D32]/20 focus-within:border-[#DD1D32] transition-all">
              <User className="w-5 h-5 text-[#9E958C] mr-3 shrink-0 stroke-[1.8]" />
              <input
                type="text"
                placeholder="Enter your name"
                value={nameInput}
                onChange={(e) => handleInputChange(e.target.value)}
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

          {/* Quick Picks Section */}
          <div className="pt-1 text-left">
            <div className="flex items-center justify-between mb-2.5 px-1">
              <span className="text-[11px] font-bold text-[#8C8278] uppercase tracking-wider">
                Quick Pick
              </span>
              <span className="text-[10px] text-[#A69A90] font-medium">
                Tap your name
              </span>
            </div>
            <div className="flex flex-wrap gap-2 justify-start">
              {memberList.map((member) => {
                const isSelected =
                  (selectedProfile && selectedProfile.name.toLowerCase() === member.toLowerCase()) ||
                  nameInput.trim().toLowerCase() === member.toLowerCase();
                return (
                  <button
                    key={member}
                    type="button"
                    onClick={() => handleSelectMember(member)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border ${
                      isSelected
                        ? 'bg-[#DD1D32] text-white border-[#DD1D32] shadow-[0_4px_12px_rgba(221,29,50,0.3)] scale-[1.03]'
                        : 'bg-white text-[#4A423B] border-[#EFE5D8] hover:border-[#DD1D32]/50 hover:bg-[#FFF7F5] active:scale-95 shadow-sm'
                    }`}
                  >
                    {member}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Let's Go Button */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-4 rounded-full bg-gradient-to-r from-[#D7192D] to-[#E3263A] hover:from-[#C91326] hover:to-[#D7192D] text-white font-bold text-base shadow-[0_12px_28px_-6px_rgba(221,29,50,0.38)] active:scale-[0.98] transition-all flex items-center justify-center space-x-2"
            >
              <span>Let&apos;s Go</span>
              <ArrowRight className="w-5 h-5 stroke-[2.4]" />
            </button>
          </div>

          {/* Install App Shortcut */}
          <div className="pt-2 flex justify-center">
            <InstallAppButton variant="pill" />
          </div>
        </form>
      </div>
    </div>
  );
}
