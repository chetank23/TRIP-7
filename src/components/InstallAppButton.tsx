'use client';

import React from 'react';
import { Download, Smartphone, Check } from 'lucide-react';
import { usePwaInstall } from '@/hooks/usePwaInstall';
import { InstallAppModal } from '@/components/InstallAppModal';

interface InstallAppButtonProps {
  variant?: 'pill' | 'card' | 'secondary' | 'compact';
  className?: string;
}

export function InstallAppButton({
  variant = 'pill',
  className = '',
}: InstallAppButtonProps) {
  const {
    isMounted,
    isInstalled,
    isIOS,
    canPromptNative,
    showInstructionsModal,
    setShowInstructionsModal,
    triggerInstall,
  } = usePwaInstall();

  if (!isMounted) return null;

  // If already running inside installed standalone app, show subtle checkmark badge or null
  if (isInstalled) {
    if (variant === 'card') {
      return (
        <div className="flex items-center space-x-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-2xl">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>BVC Trip is installed as an app</span>
        </div>
      );
    }
    return null;
  }

  return (
    <>
      {variant === 'pill' && (
        <button
          type="button"
          onClick={triggerInstall}
          className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-cream-100 hover:bg-cream-200 border border-cream-300 text-bvc-text text-xs font-bold shadow-xs active:scale-95 transition-all ${className}`}
          title="Install BVC Trip as an App"
        >
          <Smartphone className="w-3.5 h-3.5 text-bvc-red" />
          <span>Install App</span>
        </button>
      )}

      {variant === 'compact' && (
        <button
          type="button"
          onClick={triggerInstall}
          className={`w-9 h-9 rounded-full bg-white border border-[#EFE3D7] flex items-center justify-center text-[#81766C] hover:text-[#D7192D] hover:border-[#D7192D]/40 hover:bg-[#F6EDE2] active:scale-95 transition-all shadow-sm shrink-0 ${className}`}
          title="Install BVC Trip on your phone"
          aria-label="Install App"
        >
          <Download className="w-4 h-4 stroke-[2]" />
        </button>
      )}

      {variant === 'card' && (
        <button
          type="button"
          onClick={triggerInstall}
          className={`w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-bvc-red to-bvc-deepRed text-white font-bold text-xs shadow-md hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center space-x-2 ${className}`}
        >
          <Download className="w-4 h-4" />
          <span>Install App to Home Screen</span>
        </button>
      )}

      {variant === 'secondary' && (
        <button
          type="button"
          onClick={triggerInstall}
          className={`w-full py-3 px-4 rounded-2xl bg-cream-100 hover:bg-cream-200 border border-cream-300 text-bvc-text font-bold text-xs shadow-sm active:scale-[0.98] transition-all flex items-center justify-center space-x-2 ${className}`}
        >
          <Smartphone className="w-4 h-4 text-bvc-red" />
          <span>Install as App on Phone</span>
        </button>
      )}

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
