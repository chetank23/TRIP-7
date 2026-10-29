'use client';

import React from 'react';
import { useTrip } from '@/lib/trip-context';
import { LandingPage } from '@/components/LandingPage';
import { Dashboard } from '@/components/Dashboard';

export default function Home() {
  const { userName, isUserLoaded } = useTrip();

  if (!isUserLoaded) {
    return (
      <div className="min-h-screen bg-bvc-bg flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-bvc-red border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!userName) {
    return <LandingPage />;
  }

  return <Dashboard />;
}

