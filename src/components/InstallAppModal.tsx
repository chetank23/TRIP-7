'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Share,
  PlusSquare,
  Smartphone,
  CheckCircle,
  Download,
  AlertTriangle,
  Copy,
  Check,
  Compass,
} from 'lucide-react';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  isIOS: boolean;
  canPromptNative: boolean;
  onNativeInstall?: () => void;
}

export function InstallAppModal({
  isOpen,
  onClose,
  isIOS,
  canPromptNative,
  onNativeInstall,
}: InstallAppModalProps) {
  const [isInAppBrowser, setIsInAppBrowser] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ua = navigator.userAgent || navigator.vendor || '';
      const inApp = /FBAV|Instagram|WhatsApp|Telegram|Line|Twitter|Messenger|Snapchat|Bytedance/i.test(ua);
      setIsInAppBrowser(inApp);
    }
  }, []);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.origin);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Backdrop tap to close */}
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      {/* Modal Card */}
      <div className="relative w-full max-w-md bg-white rounded-t-[32px] sm:rounded-3xl p-6 shadow-2xl border border-cream-300 z-10 animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">
        {/* Header bar */}
        <div className="flex items-center justify-between pb-4 border-b border-cream-200">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-bvc-red to-[#FFC49B] p-0.5 shadow-md flex items-center justify-center shrink-0">
              <img
                src="/icon.svg"
                alt="BVC Trip Icon"
                className="w-full h-full rounded-[14px] object-cover"
              />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-bvc-text flex items-center space-x-1.5">
                <span>Install BVC Trip</span>
                <span className="px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                  PWA
                </span>
              </h3>
              <p className="text-xs font-semibold text-bvc-secondary">
                {isIOS ? 'iPhone 14+ & iOS Home Screen' : "Add to phone's home screen"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-cream-100 hover:bg-cream-200 text-bvc-secondary flex items-center justify-center transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* In-App Browser Warning (WhatsApp / Instagram / Telegram) */}
        {isInAppBrowser && (
          <div className="mt-3.5 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
            <div className="flex items-start space-x-2 font-bold">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>In-App Browser Detected</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Apple prevents &quot;Add to Home Screen&quot; inside apps like WhatsApp or Instagram.
              Please open in <strong>Safari</strong> to install on your iPhone.
            </p>
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white border border-amber-300 text-amber-900 font-bold text-xs shadow-2xs hover:bg-amber-100/50"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Link Copied! Open Safari & Paste' : 'Copy Link to Open in Safari'}</span>
            </button>
          </div>
        )}

        {/* Benefits bullets */}
        <div className="py-3.5 space-y-2">
          <div className="flex items-center space-x-2 text-xs font-medium text-bvc-text">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Fast 1-tap launch from your iPhone home screen</span>
          </div>
          <div className="flex items-center space-x-2 text-xs font-medium text-bvc-text">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Full-screen app view with Dynamic Island & notch support</span>
          </div>
          <div className="flex items-center space-x-2 text-xs font-medium text-bvc-text">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Offline-ready & background sync across all 7 friends</span>
          </div>
        </div>

        {/* Native trigger button if browser supports it (Android / Chrome) */}
        {canPromptNative && onNativeInstall ? (
          <div className="my-2">
            <button
              type="button"
              onClick={onNativeInstall}
              className="w-full py-3.5 px-4 rounded-2xl bg-bvc-red hover:bg-bvc-deepRed text-white font-bold text-sm shadow-md active:scale-[0.98] transition-all flex items-center justify-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Install Directly to Device</span>
            </button>
          </div>
        ) : null}

        {/* Step-by-Step Instructions */}
        <div className="mt-2 bg-[#FAF7F2] border border-[#EFE3D7] rounded-2xl p-4 text-xs space-y-3.5">
          <div className="flex items-center space-x-2">
            {isIOS ? (
              <Compass className="w-4 h-4 text-bvc-red shrink-0" />
            ) : (
              <Smartphone className="w-4 h-4 text-bvc-red shrink-0" />
            )}
            <h4 className="font-bold text-bvc-text">
              {isIOS ? 'How to install on iPhone (Safari):' : 'How to install on Android / Browser:'}
            </h4>
          </div>

          {isIOS ? (
            <ol className="space-y-3 text-bvc-secondary pl-1 font-medium">
              <li className="flex items-start space-x-2.5">
                <span className="w-5 h-5 rounded-full bg-cream-200 text-bvc-text font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <span className="leading-snug">
                  At the bottom of Safari, tap the{' '}
                  <strong className="text-bvc-text inline-flex items-center px-1.5 py-0.5 rounded bg-white border border-cream-300 font-bold">
                    <Share className="w-3 h-3 inline mr-1 text-blue-600" /> Share
                  </strong>{' '}
                  button (square with arrow pointing up).
                </span>
              </li>

              <li className="flex items-start space-x-2.5">
                <span className="w-5 h-5 rounded-full bg-cream-200 text-bvc-text font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <span className="leading-snug">
                  Scroll down the menu and tap{' '}
                  <strong className="text-bvc-text inline-flex items-center px-1.5 py-0.5 rounded bg-white border border-cream-300 font-bold">
                    <PlusSquare className="w-3.5 h-3.5 inline mr-1 text-bvc-text" /> Add to Home Screen
                  </strong>.
                </span>
              </li>

              <li className="flex items-start space-x-2.5">
                <span className="w-5 h-5 rounded-full bg-cream-200 text-bvc-text font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <span className="leading-snug">
                  Tap <strong className="text-bvc-text">Add</strong> in the top-right corner. The BVC Trip icon will appear directly on your home screen!
                </span>
              </li>
            </ol>
          ) : (
            <ol className="space-y-3 text-bvc-secondary pl-1 font-medium">
              <li className="flex items-start space-x-2.5">
                <span className="w-5 h-5 rounded-full bg-cream-200 text-bvc-text font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <span className="leading-snug">
                  Tap the browser menu <strong className="text-bvc-text">(⋮ or three dots)</strong> in the top right.
                </span>
              </li>

              <li className="flex items-start space-x-2.5">
                <span className="w-5 h-5 rounded-full bg-cream-200 text-bvc-text font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <span className="leading-snug">
                  Select <strong className="text-bvc-text">&quot;Install App&quot;</strong> or <strong className="text-bvc-text">&quot;Add to Home Screen&quot;</strong>.
                </span>
              </li>

              <li className="flex items-start space-x-2.5">
                <span className="w-5 h-5 rounded-full bg-cream-200 text-bvc-text font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <span className="leading-snug">
                  Tap <strong className="text-bvc-text">Install</strong> to confirm.
                </span>
              </li>
            </ol>
          )}
        </div>

        {/* Dismiss Button */}
        <div className="mt-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-cream-200 hover:bg-cream-300 text-bvc-text font-bold text-xs transition-colors"
          >
            Got it, close
          </button>
        </div>
      </div>
    </div>
  );
}
