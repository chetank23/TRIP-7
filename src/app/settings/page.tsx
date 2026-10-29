'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTrip } from '@/lib/trip-context';
import { Header } from '@/components/Header';
import {
  Wallet,
  RefreshCw,
  Users,
  Info,
  Database,
  LogOut,
  ChevronRight,
  Pencil,
  Check,
  X,
  Palmtree,
  ShieldAlert,
  Trash2,
  Lock,
  AlertTriangle,
  Smartphone,
  Download,
} from 'lucide-react';
import { InstallAppButton } from '@/components/InstallAppButton';
import { isOrganizer } from '@/lib/auth';
import { ChetanPasswordModal } from '@/components/ChetanPasswordModal';

export default function SettingsPage() {
  const router = useRouter();
  const {
    userName,
    setUserName,
    logout,
    state,
    storageStatus,
    refreshState,
    isSyncing,
    openBudgetModal,
    showToast,
    clearAllData,
    isOrganizerUser,
  } = useTrip();

  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [nameInput, setNameInput] = useState<string>(userName || '');
  const [showPasswordModal, setShowPasswordModal] = useState<boolean>(false);
  const [pendingNewName, setPendingNewName] = useState<string>('');
  const [showMembersModal, setShowMembersModal] = useState<boolean>(false);
  const [newMemberName, setNewMemberName] = useState<string>('');

  const [showResetModal, setShowResetModal] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [resetBudgetChoice, setResetBudgetChoice] = useState<boolean>(false);
  const [wipeHistoryChoice, setWipeHistoryChoice] = useState<boolean>(true);

  const currentBudget = state?.budget?.total || 0;
  const isBudgetConfigured = Boolean(state?.budget?.isConfigured);
  const members =
    state?.members && state.members.length > 0
      ? state.members
      : [
          'Chetan K',
          'Adithi',
          'Harshitha',
          'Dharma',
          'Lavanya',
          'Rohith',
          'Vyshnavi',
        ];

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nameInput.trim();
    if (!trimmed) return;

    if (isOrganizer(trimmed) && !isOrganizer(userName)) {
      setPendingNewName(trimmed);
      setShowPasswordModal(true);
      return;
    }

    setUserName(trimmed);
    setIsEditingName(false);
    showToast(`Display name updated to ${trimmed}`, 'success');
  };

  const handlePasswordSuccess = () => {
    setShowPasswordModal(false);
    const newName = pendingNewName || 'Chetan K';
    setUserName(newName);
    setIsEditingName(false);
    showToast(`Welcome Chetan! Display name updated to ${newName}`, 'success');
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newMemberName.trim();
    if (!trimmed || members.includes(trimmed)) return;

    try {
      const res = await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_MEMBERS',
          payload: { members: [...members, trimmed] },
          expectedVersion: state?.version,
          actor: userName || 'Member',
        }),
      });
      const json = await res.json();
      if (json.success) {
        setNewMemberName('');
        showToast(`Added ${trimmed} to group members`, 'success');
        refreshState();
      }
    } catch {
      showToast('Error updating group members', 'error');
    }
  };

  const handleClearAllData = async () => {
    setIsResetting(true);
    try {
      const ok = await clearAllData({
        resetBudget: resetBudgetChoice,
        clearActivities: wipeHistoryChoice,
        wipeEverything: wipeHistoryChoice,
      });
      if (ok) {
        setShowResetModal(false);
      }
    } finally {
      setIsResetting(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-bvc-bg pb-28">
      <Header title="Settings & Profile" showBack />

      <main className="max-w-lg mx-auto px-4 pt-3 space-y-4">
        {/* Profile Card */}
        <div className="bg-white rounded-3xl p-5 border border-cream-300 shadow-card flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-bvc-red to-bvc-peach text-white flex items-center justify-center text-xl font-bold shadow-sm">
              {(userName?.[0] || 'C').toUpperCase()}
            </div>

            <div>
              {isEditingName ? (
                <form onSubmit={handleSaveName} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="px-2.5 py-1 text-sm font-bold border border-bvc-red rounded-xl focus:outline-none bg-cream-50"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="w-7 h-7 rounded-lg bg-bvc-red text-white flex items-center justify-center"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingName(false)}
                    className="w-7 h-7 rounded-lg bg-cream-200 text-bvc-secondary flex items-center justify-center"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <>
                  <h3 className="text-base font-extrabold text-bvc-text leading-tight">
                    {userName || 'Member'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setNameInput(userName || '');
                      setIsEditingName(true);
                    }}
                    className="text-xs font-semibold text-bvc-red hover:underline mt-0.5 inline-flex items-center space-x-1"
                  >
                    <span>Change name</span>
                    <Pencil className="w-3 h-3" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Trip Settings Section */}
        <div className="space-y-1.5">
          <h4 className="text-xs font-bold text-bvc-secondary px-1 uppercase tracking-wider">
            Trip Settings
          </h4>

          <div className="bg-white rounded-3xl border border-cream-300 shadow-card divide-y divide-cream-200 overflow-hidden">
            {/* Trip Budget Item */}
            <button
              type="button"
              onClick={openBudgetModal}
              className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-cream-50 transition-colors text-left"
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-bvc-peach/30 text-bvc-red flex items-center justify-center">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-bvc-text block">Trip Budget</span>
                  <span className="text-[11px] text-bvc-secondary">
                    {isBudgetConfigured ? 'Shared among all 7 members' : 'Tap to configure budget'}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-sm font-extrabold text-bvc-text tabular-nums">
                  {isBudgetConfigured ? `₹ ${currentBudget.toLocaleString('en-IN')}` : 'Not set'}
                </span>
                <ChevronRight className="w-4 h-4 text-bvc-secondary" />
              </div>
            </button>

            {/* Edit Budget Item */}
            <button
              type="button"
              onClick={openBudgetModal}
              className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-cream-50 transition-colors text-left"
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-cream-100 text-bvc-secondary flex items-center justify-center">
                  <Pencil className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-bvc-text">Edit Budget</span>
              </div>
              <ChevronRight className="w-4 h-4 text-bvc-secondary" />
            </button>

            {/* Refresh Shared Data */}
            <button
              type="button"
              onClick={async () => {
                await refreshState();
                showToast('Shared trip data reloaded', 'success');
              }}
              className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-cream-50 transition-colors text-left"
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-cream-100 text-bvc-secondary flex items-center justify-center">
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-bvc-red' : ''}`} />
                </div>
                <span className="text-xs font-bold text-bvc-text">Refresh Shared Data</span>
              </div>
              <ChevronRight className="w-4 h-4 text-bvc-secondary" />
            </button>
          </div>
        </div>

        {/* PWA App Installation Section */}
        <div className="space-y-1.5">
          <h4 className="text-xs font-bold text-bvc-secondary px-1 uppercase tracking-wider flex items-center space-x-1.5">
            <Smartphone className="w-3.5 h-3.5 text-bvc-red" />
            <span>Install App</span>
          </h4>

          <div className="bg-white rounded-3xl border border-cream-300 p-5 shadow-card space-y-3.5">
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-bvc-red to-[#FFC49B] p-0.5 shadow-sm shrink-0 flex items-center justify-center">
                <img
                  src="/icon.svg"
                  alt="BVC Trip App Icon"
                  className="w-full h-full rounded-[14px] object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-extrabold text-bvc-text truncate">
                  BVC Trip Mobile App
                </h4>
                <p className="text-xs font-medium text-bvc-secondary mt-0.5 leading-snug">
                  Install on your phone for quick 1-tap launch, offline viewing & full-screen view.
                </p>
              </div>
            </div>

            <InstallAppButton variant="card" />
          </div>
        </div>

        {/* App Settings Section */}
        <div className="space-y-1.5">
          <h4 className="text-xs font-bold text-bvc-secondary px-1 uppercase tracking-wider">
            App Settings
          </h4>

          <div className="bg-white rounded-3xl border border-cream-300 shadow-card divide-y divide-cream-200 overflow-hidden">
            {/* Group Members Item */}
            <button
              type="button"
              onClick={() => setShowMembersModal(true)}
              className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-cream-50 transition-colors text-left"
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-cream-100 text-bvc-secondary flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-bvc-text block">Group Members</span>
                  <span className="text-[11px] text-bvc-secondary">
                    {members.length} friends tracking this trip
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold text-bvc-success">Enabled</span>
                <ChevronRight className="w-4 h-4 text-bvc-secondary" />
              </div>
            </button>

            {/* Storage Status */}
            <div className="px-5 py-3.5">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-cream-100 text-bvc-secondary flex items-center justify-center">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-bvc-text block">Vercel Blob Storage</span>
                    <span className="text-[10px] text-bvc-secondary">
                      {storageStatus?.message || 'Connecting to Vercel Blob store...'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 shrink-0 pl-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      storageStatus?.connected
                        ? 'bg-bvc-success animate-pulse'
                        : storageStatus?.code === 'STATE_NOT_INITIALIZED'
                        ? 'bg-amber-500'
                        : 'bg-bvc-error'
                    }`}
                  />
                  <span
                    className={`text-xs font-bold ${
                      storageStatus?.connected
                        ? 'text-bvc-success'
                        : storageStatus?.code === 'STATE_NOT_INITIALIZED'
                        ? 'text-amber-600'
                        : 'text-bvc-error'
                    }`}
                  >
                    {storageStatus?.status || (storageStatus?.connected ? 'Connected' : 'Disconnected')}
                  </span>
                </div>
              </div>

              {/* Diagnostic Trigger Button */}
              <div className="mt-2 pt-2 border-t border-cream-200 flex items-center justify-between">
                <span className="text-[10px] text-bvc-muted">
                  {storageStatus?.connected ? 'Store Verified & Active' : 'Requires BLOB_READ_WRITE_TOKEN in .env.local'}
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/storage/health');
                      const json = await res.json();
                      if (json.ok) {
                        showToast('Vercel Blob health check verified: Write/read round-trip passed!', 'success');
                      } else {
                        showToast(`Storage Status: ${json.status}. ${json.message}`, 'error');
                      }
                      refreshState();
                    } catch {
                      showToast('Health check failed to execute', 'error');
                    }
                  }}
                  className="text-[11px] font-bold text-bvc-red hover:underline"
                >
                  Run Storage Health Check →
                </button>
              </div>
            </div>

            {/* App Info */}
            <div className="px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-cream-100 text-bvc-secondary flex items-center justify-center">
                  <Info className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-bvc-text block">App Info</span>
                  <span className="text-[10px] text-bvc-secondary">
                    BVC Trip v1.0 · Vercel Ready
                  </span>
                </div>
              </div>
              <span className="text-xs font-mono text-bvc-muted">v1.0.0</span>
            </div>
          </div>
        </div>

        {/* Organizer Special Access Section */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between px-1">
            <h4 className="text-xs font-bold text-bvc-secondary uppercase tracking-wider flex items-center space-x-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-bvc-red" />
              <span>Organizer Privileges</span>
            </h4>
            <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
              Chetan K Exclusive
            </span>
          </div>

          {isOrganizerUser ? (
            <div className="bg-white rounded-3xl border border-red-200/80 p-5 shadow-card space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-red-50 text-bvc-red flex items-center justify-center shrink-0 mt-0.5 border border-red-100">
                  <Trash2 className="w-5 h-5 stroke-[2]" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-bvc-text">Clear All Trip Data</h5>
                  <p className="text-[11px] text-bvc-secondary leading-relaxed mt-0.5">
                    Wipes all recorded expenses, uploaded receipts, and activity history from the cloud store for all 7 members to start the trip fresh.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowResetModal(true)}
                className="w-full py-3 rounded-2xl bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center space-x-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Clear All Trip Data (Special Access)</span>
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-cream-300 p-4 shadow-card flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-cream-100 text-bvc-muted flex items-center justify-center shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div className="text-xs text-bvc-secondary leading-snug">
                Data clearing and full reset is restricted to <strong className="text-bvc-text">Chetan K</strong> as the trip organizer.
              </div>
            </div>
          )}
        </div>

        {/* Logout / Switch Member Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full py-3.5 rounded-2xl bg-red-50 hover:bg-red-100 text-bvc-error text-xs font-bold transition-colors flex items-center justify-center space-x-2 border border-red-200"
          >
            <LogOut className="w-4 h-4" />
            <span>Switch Member / Logout</span>
          </button>
        </div>
      </main>

      {/* Group Members Modal */}
      {showMembersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-bvc-text/40 backdrop-blur-sm"
            onClick={() => setShowMembersModal(false)}
          />

          <div className="relative w-full max-w-sm bg-cream-50 rounded-3xl p-6 shadow-floating border border-cream-300 z-10 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-bvc-peach/30 text-bvc-red flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-bvc-text">Trip Friends</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowMembersModal(false)}
                className="w-8 h-8 rounded-full bg-cream-200 flex items-center justify-center text-bvc-secondary hover:text-bvc-text"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-bvc-secondary mb-3 leading-relaxed">
              These members can be chosen as payers when recording expenses.
            </p>

            <div className="space-y-2 mb-4 max-h-48 overflow-y-auto pr-1">
              {members.map((m) => (
                <div
                  key={m}
                  className="bg-white rounded-xl px-3.5 py-2 border border-cream-300 flex items-center justify-between text-xs font-bold text-bvc-text"
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-full bg-bvc-redLight text-bvc-red flex items-center justify-center text-[10px]">
                      {m[0].toUpperCase()}
                    </div>
                    <span>{m}</span>
                  </div>
                  {m === userName && (
                    <span className="text-[10px] text-bvc-red font-medium">(Current)</span>
                  )}
                </div>
              ))}
            </div>

            <form onSubmit={handleAddMember} className="flex space-x-2">
              <input
                type="text"
                placeholder="Add member name..."
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-white border border-cream-300 text-xs font-medium text-bvc-text focus:outline-none focus:ring-1 focus:ring-bvc-red"
              />
              <button
                type="submit"
                className="px-3.5 py-2 rounded-xl bg-bvc-red text-white text-xs font-bold hover:bg-bvc-deepRed transition-colors"
              >
                Add
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Organizer Clear All Data Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-bvc-text/50 backdrop-blur-sm transition-opacity"
            onClick={() => !isResetting && setShowResetModal(false)}
          />

          <div className="relative w-full max-w-sm bg-cream-50 rounded-3xl p-6 shadow-floating border border-cream-300 z-10 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-red-100 text-bvc-red flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 stroke-[2.2]" />
                </div>
                <h3 className="text-base font-extrabold text-bvc-text">Clear All Trip Data?</h3>
              </div>
              <button
                type="button"
                disabled={isResetting}
                onClick={() => setShowResetModal(false)}
                className="w-8 h-8 rounded-full bg-cream-200 flex items-center justify-center text-bvc-secondary hover:text-bvc-text disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-bvc-secondary leading-relaxed mb-4">
              You are logged in as <strong className="text-bvc-text font-bold">Chetan K</strong>. This special organizer action permanently clears shared data from the Vercel Blob store for all 7 members.
            </p>

            <div className="bg-white rounded-2xl p-3.5 border border-cream-300 space-y-2.5 mb-5 text-xs text-bvc-text font-medium">
              <label className="flex items-center space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={wipeHistoryChoice}
                  onChange={(e) => setWipeHistoryChoice(e.target.checked)}
                  className="rounded border-cream-300 text-bvc-red focus:ring-bvc-red w-4 h-4"
                />
                <span>Wipe all expenses & receipt files</span>
              </label>

              <label className="flex items-center space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={resetBudgetChoice}
                  onChange={(e) => setResetBudgetChoice(e.target.checked)}
                  className="rounded border-cream-300 text-bvc-red focus:ring-bvc-red w-4 h-4"
                />
                <span>Also reset shared budget back to ₹0</span>
              </label>
            </div>

            <div className="flex space-x-2">
              <button
                type="button"
                disabled={isResetting}
                onClick={() => setShowResetModal(false)}
                className="flex-1 py-3 rounded-2xl bg-cream-200 hover:bg-cream-300 text-bvc-text text-xs font-bold transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isResetting}
                onClick={handleClearAllData}
                className="flex-1 py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center space-x-1.5 shadow-sm"
              >
                {isResetting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Clearing...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Wipe Data</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chetan Passcode Verification Modal */}
      <ChetanPasswordModal
        isOpen={showPasswordModal}
        onSuccess={handlePasswordSuccess}
        onCancel={() => setShowPasswordModal(false)}
      />
    </div>
  );
}

