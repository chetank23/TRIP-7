'use client';

import React from 'react';

export function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse w-full max-w-lg mx-auto">
      {/* Header skeleton */}
      <div className="flex items-center justify-between py-2">
        <div className="h-6 w-32 bg-cream-300 rounded-lg" />
        <div className="h-8 w-8 bg-cream-300 rounded-full" />
      </div>

      {/* Virtual Card skeleton */}
      <div className="h-48 w-full rounded-3xl bg-cream-300" />

      {/* Budget Summary skeleton */}
      <div className="h-28 w-full rounded-3xl bg-cream-200" />

      {/* Grid skeleton */}
      <div className="grid grid-cols-3 gap-2.5">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-20 rounded-2xl bg-cream-200" />
        ))}
      </div>

      {/* Transactions list skeleton */}
      <div className="h-40 w-full rounded-3xl bg-cream-200" />
    </div>
  );
}
