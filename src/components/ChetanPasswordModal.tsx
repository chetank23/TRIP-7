'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Lock, X, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { verifyOrganizerPassword, setOrganizerVerified } from '@/lib/auth';

interface ChetanPasswordModalProps {
  isOpen: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ChetanPasswordModal({
  isOpen,
  onSuccess,
  onCancel,
}: ChetanPasswordModalProps) {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError(null);
      setIsShaking(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleVerify = (passcodeToTest: string) => {
    if (verifyOrganizerPassword(passcodeToTest)) {
      setError(null);
      setOrganizerVerified(true);
      onSuccess();
    } else {
      setError('Incorrect passcode. Please try again.');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      setPin('');
      inputRef.current?.focus();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
    setPin(val);
    if (error) setError(null);

    // Auto-submit when 4 digits are entered
    if (val.length === 4) {
      handleVerify(val);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin) {
      setError('Please enter your 4-digit passcode');
      return;
    }
    handleVerify(pin);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onCancel} aria-hidden="true" />

      <div
        className={`relative w-full max-w-sm bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-cream-300 z-10 transition-transform ${
          isShaking ? 'animate-shake' : 'animate-in zoom-in-95 duration-200'
        }`}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-cream-100 hover:bg-cream-200 text-bvc-secondary flex items-center justify-center transition-colors"
          aria-label="Cancel login"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Profile Avatar & Badge */}
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-3">
            <div className="w-20 h-20 rounded-full border-4 border-bvc-peach/30 shadow-md overflow-hidden bg-cream-100 flex items-center justify-center">
              <img
                src="https://res.cloudinary.com/dccnccjgr/image/upload/v1793307425/CHETHAN_o38wnn.png"
                alt="Chethan K"
                className="w-full h-full object-cover object-top"
              />
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-bvc-red text-white flex items-center justify-center shadow-sm ring-2 ring-white">
              <Lock className="w-3.5 h-3.5" />
            </div>
          </div>

          <h3 className="text-lg font-black text-bvc-text tracking-tight">
            Organizer Access
          </h3>
          <p className="text-xs text-bvc-secondary font-medium mt-1">
            Logging in as <strong className="text-bvc-text">Chetan K</strong>
          </p>
          <div className="mt-2 inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-[10px] font-bold text-amber-900">
            <ShieldCheck className="w-3 h-3 text-amber-600" />
            <span>Passcode Protected</span>
          </div>
        </div>

        {/* PIN Entry Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="flex flex-col items-center">
            <label htmlFor="chetan-pin" className="sr-only">
              Enter 4-Digit Passcode
            </label>
            
            {/* Visual 4-Digit Dots */}
            <div className="flex items-center justify-center space-x-3 mb-3">
              {[0, 1, 2, 3].map((idx) => {
                const filled = pin.length > idx;
                return (
                  <div
                    key={idx}
                    className={`w-11 h-12 rounded-xl flex items-center justify-center text-xl font-black border transition-all ${
                      filled
                        ? 'border-bvc-red bg-red-50/50 text-bvc-red scale-105 shadow-xs'
                        : 'border-cream-300 bg-cream-50 text-cream-400'
                    }`}
                  >
                    {filled ? '•' : ''}
                  </div>
                );
              })}
            </div>

            {/* Hidden / Transparent actual input for accessibility & mobile numeric keypad */}
            <input
              id="chetan-pin"
              ref={inputRef}
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={pin}
              onChange={handleChange}
              placeholder="••••"
              autoComplete="off"
              className="w-36 text-center tracking-[0.6em] text-lg font-mono font-bold py-2 px-3 border border-cream-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-bvc-red/30 focus:border-bvc-red bg-white"
            />

            {error && (
              <div className="mt-3 flex items-center space-x-1.5 text-xs text-bvc-red font-semibold animate-in fade-in">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="pt-2 flex flex-col space-y-2">
            <button
              type="submit"
              disabled={pin.length < 4}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-bvc-red to-bvc-deepRed text-white font-bold text-sm shadow-md active:scale-[0.98] transition-all flex items-center justify-center space-x-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>Unlock Dashboard</span>
              <ArrowRight className="w-4 h-4 stroke-[2.4]" />
            </button>

            <button
              type="button"
              onClick={onCancel}
              className="w-full py-2.5 rounded-xl text-xs font-semibold text-bvc-secondary hover:text-bvc-text hover:bg-cream-100 transition-colors"
            >
              Cancel & Pick Another Name
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

