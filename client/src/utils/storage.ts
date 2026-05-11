/**
 * localStorage helpers for BusinessProfile persistence.
 * Requirements: 1.7, 24.1, 24.2, 24.3, 24.4
 *
 * Key: "smewise_business_profile"
 * Value: JSON.stringify(BusinessProfile)
 */

import type { BusinessProfile } from "../types";

const STORAGE_KEY = "smewise_business_profile";

/**
 * Serialises and saves a BusinessProfile to localStorage.
 * Silently warns on failure (e.g. storage quota exceeded, private browsing).
 */
export function saveProfile(profile: BusinessProfile): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch (err) {
    console.warn("[SMEwise] Failed to save profile to localStorage:", err);
  }
}

/**
 * Loads and deserialises a BusinessProfile from localStorage.
 * Returns null if no profile is stored or if parsing fails.
 */
export function loadProfile(): BusinessProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    return JSON.parse(raw) as BusinessProfile;
  } catch (err) {
    console.warn("[SMEwise] Failed to load profile from localStorage:", err);
    return null;
  }
}
