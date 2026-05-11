/**
 * Unit tests for localStorage helpers: saveProfile / loadProfile
 * Requirements: 1.7, 24.1, 24.2, 24.3, 24.4
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { saveProfile, loadProfile } from "./storage";
import type { BusinessProfile } from "../types";

const sampleProfile: BusinessProfile = {
  companyName: "Nasi Lemak Tech",
  industry: "Food & Beverage",
  city: "Kuala Lumpur",
  targetCustomer: "Office workers",
  mainGoal: "Expand to 3 outlets",
  currentFunds: 50000,
  businessStage: "1–2 Years Operating",
  businessType: "Sole Proprietorship",
};

describe("saveProfile / loadProfile", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("returns null when localStorage is empty", () => {
    expect(loadProfile()).toBeNull();
  });

  it("saves and loads a profile with deep equality", () => {
    saveProfile(sampleProfile);
    const loaded = loadProfile();
    expect(loaded).toEqual(sampleProfile);
  });

  it("overwrites a previously saved profile", () => {
    saveProfile(sampleProfile);
    const updated: BusinessProfile = { ...sampleProfile, companyName: "Updated Co" };
    saveProfile(updated);
    expect(loadProfile()).toEqual(updated);
  });

  it("returns null and warns when localStorage.getItem returns invalid JSON", () => {
    localStorage.setItem("smewise_business_profile", "not-valid-json{{{");
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = loadProfile();
    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalledOnce();
  });

  it("does not throw and warns when localStorage.setItem throws", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError");
    });
    expect(() => saveProfile(sampleProfile)).not.toThrow();
    expect(warnSpy).toHaveBeenCalledOnce();
  });

  it("does not throw and warns when localStorage.getItem throws", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("SecurityError");
    });
    expect(() => loadProfile()).not.toThrow();
    expect(loadProfile()).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
  });

  it("preserves all BusinessProfile fields after round-trip", () => {
    saveProfile(sampleProfile);
    const loaded = loadProfile()!;
    expect(loaded.companyName).toBe(sampleProfile.companyName);
    expect(loaded.industry).toBe(sampleProfile.industry);
    expect(loaded.city).toBe(sampleProfile.city);
    expect(loaded.targetCustomer).toBe(sampleProfile.targetCustomer);
    expect(loaded.mainGoal).toBe(sampleProfile.mainGoal);
    expect(loaded.currentFunds).toBe(sampleProfile.currentFunds);
    expect(loaded.businessStage).toBe(sampleProfile.businessStage);
    expect(loaded.businessType).toBe(sampleProfile.businessType);
  });
});
