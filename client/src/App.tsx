/**
 * App — root component
 * Requirements: 1.4, 1.7, 1.8, 24.1, 24.2
 *
 * On mount: loads any saved BusinessProfile from localStorage.
 * If found, pre-populates the form and unlocks the Dashboard immediately.
 * On valid form submit: saves the profile, unlocks the Dashboard, and
 * sets a flag to trigger Profile Summary Card generation (task 6.1).
 */

import { useState, useEffect } from "react";
import type { BusinessProfile } from "./types";
import { loadProfile, saveProfile } from "./utils/storage";
import ProfileForm from "./components/ProfileForm";
import ProfileSummaryCard from "./components/ProfileSummaryCard";
import Dashboard from "./components/Dashboard";
import GlobalProgressBar from "./components/GlobalProgressBar";
import { LoadingProvider } from "./context/LoadingContext";

function AppContent() {
  // ── Profile state ──
  const [profile, setProfile] = useState<BusinessProfile | null>(null);

  // ── Dashboard unlock ──
  const [isUnlocked, setIsUnlocked] = useState(false);

  // ── Trigger flag for Profile Summary Card ──
  const [triggerSummary, setTriggerSummary] = useState(false);

  // ── On mount: restore saved profile ──
  useEffect(() => {
    const saved = loadProfile();
    if (saved) {
      setProfile(saved);
      setIsUnlocked(true);
    }
  }, []);

  // ── Form submit handler ──
  function handleProfileSubmit(submitted: BusinessProfile) {
    saveProfile(submitted);
    setProfile(submitted);
    setIsUnlocked(true);
    setTriggerSummary(true);
  }

  return (
    <div className="min-h-screen bg-[#0f0d1a] text-white">
      {/* ── Global progress bar (fixed top) ── */}
      <GlobalProgressBar />

      {/* ── Header ── */}
      <header
        className="border-b"
        style={{ borderColor: "var(--border-default)", background: "var(--bg-card)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7c3aed] to-[#a78bfa] flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <h1 className="text-xl font-semibold text-white">
              SME<span className="text-[#a78bfa]">wise</span>
            </h1>
          </div>
        </div>
      </header>

      {/* ── Main content ── */}
      <main>
        {/* Business Profile Form */}
        <ProfileForm
          initialProfile={profile}
          onSubmit={handleProfileSubmit}
        />

        {/* Profile Summary Card — shown once profile is submitted or restored */}
        {isUnlocked && (
          <ProfileSummaryCard profile={profile!} trigger={triggerSummary} />
        )}

        {/* Dashboard — always rendered; sections are locked until profile is submitted */}
        <Dashboard profile={profile} isUnlocked={isUnlocked} />
      </main>
    </div>
  );
}

function App() {
  return (
    <LoadingProvider>
      <AppContent />
    </LoadingProvider>
  );
}

export default App;
