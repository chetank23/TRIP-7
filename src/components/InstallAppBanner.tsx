'use client';

import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X } from 'lucide-react';
import { usePwaInstall } from '@/hooks/usePwaInstall';
import { InstallAppModal } from '@/components/InstallAppModal';

const DISMISS_KEY = 'bvc_pwa_banner_dismissed';

export function InstallAppBanner() {
  const {
    isMounted,
    isInstalled,
    isIOS,
    canPromptNative,
    showInstructionsModal,
    setShowInstructionsModal,
    triggerInstall,
  } = usePwaInstall();

  const [isDismissed, setIsDismissed] = useState<boolean>(true);

  useEffect(() => {
    if (!isMounted) return;
    try {
      const dismissed = localStorage.getItem(DISMISS_KEY);
      // Show if not dismissed and not already installed
      if (!dismissed && !isInstalled) {
        setIsDismissed(false);
      }
    } catch {
      setIsDismissed(false);
    }
  }, [isMounted, isInstalled]);

  if (!isMounted || isInstalled || isDismissed) return null;

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, 'true');
    } catch {}
  };

  return (
    <>
      <div className="bvc-glass-surface w-full bg-gradient-to-r from-white/90 to-[#FFF8F3]/90 border border-white/80 rounded-3xl p-3.5 sm:p-4 shadow-card flex items-center justify-between gap-3 animate-in fade-in duration-300">
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-bvc-red to-[#FFC49B] p-0.5 shadow-sm shrink-0 flex items-center justify-center">
            <img
              src="/icon.svg"
              alt="BVC App"
              className="w-full h-full rounded-[14px] object-cover"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-1.5">
              <h4 className="text-xs font-black text-bvc-text truncate">
                Install BVC Trip App
              </h4>
              <span className="px-1.5 py-0.5 rounded-full bg-bvc-peach/30 text-[9px] font-bold text-bvc-red uppercase">
                PWA
              </span>
            </div>
            <p className="text-[11px] font-semibold text-bvc-secondary mt-0.5 truncate">
              Add to Home Screen for 1-tap quick access
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 shrink-0">
          <button
            type="button"
            onClick={triggerInstall}
            className="px-3 py-1.5 rounded-xl bg-bvc-red hover:bg-bvc-deepRed text-white text-xs font-bold shadow-xs active:scale-95 transition-all flex items-center space-x-1"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install</span>
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className="w-7 h-7 rounded-full bg-cream-200/80 hover:bg-cream-300 text-bvc-secondary flex items-center justify-center transition-colors"
            aria-label="Dismiss banner"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <InstallAppModal
        isOpen={showInstructionsModal}
        onClose={() => setShowInstructionsModal(false)}
        isIOS={isIOS}
        canPromptNative={canPromptNative}
        onNativeInstall={triggerInstall}
      />
    </>
  );
}

