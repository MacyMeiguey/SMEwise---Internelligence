/**
 * Unit tests for the validateProfile utility
 * Requirements: 1.5
 */
import { describe, it, expect } from "vitest";
import { validateProfile } from "./validateProfile";
import type { BusinessProfile } from "../types";

// A fully valid profile used as a baseline for individual field tests
const validProfile: BusinessProfile = {
  companyName: "Kedai Maju Sdn Bhd",
  industry: "Retail",
  city: "Kuala Lumpur",
  targetCustomer: "Young urban professionals",
  mainGoal: "Expand to 3 outlets by end of year",
  currentFunds: 50000,
  businessStage: "Just Launched",
  businessType: "Sdn Bhd",
};

describe("validateProfile", () => {
  // ── Valid profile ──────────────────────────────────────────────────────────

  it("returns an empty object for a fully valid profile", () => {
    expect(validateProfile(validProfile)).toEqual({});
  });

  it("returns an empty object when mainGoal is empty (it is optional)", () => {
    const profile: BusinessProfile = { ...validProfile, mainGoal: "" };
    expect(validateProfile(profile)).toEqual({});
  });

  // ── Required text fields ───────────────────────────────────────────────────

  it("returns an error for missing companyName", () => {
    const profile: BusinessProfile = { ...validProfile, companyName: "" };
    const errors = validateProfile(profile);
    expect(errors).toHaveProperty("companyName");
    expect(errors.companyName).toBeTruthy();
  });

  it("returns an error for whitespace-only companyName", () => {
    const profile: BusinessProfile = { ...validProfile, companyName: "   " };
    const errors = validateProfile(profile);
    expect(errors).toHaveProperty("companyName");
  });

  it("returns an error for missing industry", () => {
    const profile: BusinessProfile = { ...validProfile, industry: "" };
    const errors = validateProfile(profile);
    expect(errors).toHaveProperty("industry");
    expect(errors.industry).toBeTruthy();
  });

  it("returns an error for whitespace-only industry", () => {
    const profile: BusinessProfile = { ...validProfile, industry: "   " };
    const errors = validateProfile(profile);
    expect(errors).toHaveProperty("industry");
  });

  it("returns an error for missing city", () => {
    const profile: BusinessProfile = { ...validProfile, city: "" };
    const errors = validateProfile(profile);
    expect(errors).toHaveProperty("city");
    expect(errors.city).toBeTruthy();
  });

  it("returns an error for whitespace-only city", () => {
    const profile: BusinessProfile = { ...validProfile, city: "   " };
    const errors = validateProfile(profile);
    expect(errors).toHaveProperty("city");
  });

  it("returns an error for missing targetCustomer", () => {
    const profile: BusinessProfile = { ...validProfile, targetCustomer: "" };
    const errors = validateProfile(profile);
    expect(errors).toHaveProperty("targetCustomer");
    expect(errors.targetCustomer).toBeTruthy();
  });

  it("returns an error for whitespace-only targetCustomer", () => {
    const profile: BusinessProfile = { ...validProfile, targetCustomer: "   " };
    const errors = validateProfile(profile);
    expect(errors).toHaveProperty("targetCustomer");
  });

  it("returns an error for missing businessStage", () => {
    // Cast to bypass TypeScript enum constraint for testing
    const profile = { ...validProfile, businessStage: "" } as unknown as BusinessProfile;
    const errors = validateProfile(profile);
    expect(errors).toHaveProperty("businessStage");
    expect(errors.businessStage).toBeTruthy();
  });

  it("returns an error for missing businessType", () => {
    const profile = { ...validProfile, businessType: "" } as unknown as BusinessProfile;
    const errors = validateProfile(profile);
    expect(errors).toHaveProperty("businessType");
    expect(errors.businessType).toBeTruthy();
  });

  // ── currentFunds validation ────────────────────────────────────────────────

  it("returns an error when currentFunds is below 1000", () => {
    const profile: BusinessProfile = { ...validProfile, currentFunds: 999 };
    const errors = validateProfile(profile);
    expect(errors).toHaveProperty("currentFunds");
    expect(errors.currentFunds).toBeTruthy();
  });

  it("returns an error when currentFunds is 0", () => {
    const profile: BusinessProfile = { ...validProfile, currentFunds: 0 };
    const errors = validateProfile(profile);
    expect(errors).toHaveProperty("currentFunds");
  });

  it("returns an error when currentFunds is negative", () => {
    const profile: BusinessProfile = { ...validProfile, currentFunds: -500 };
    const errors = validateProfile(profile);
    expect(errors).toHaveProperty("currentFunds");
  });

  it("does NOT return an error when currentFunds is exactly 1000", () => {
    const profile: BusinessProfile = { ...validProfile, currentFunds: 1000 };
    const errors = validateProfile(profile);
    expect(errors).not.toHaveProperty("currentFunds");
  });

  it("does NOT return an error when currentFunds is above 1000", () => {
    const profile: BusinessProfile = { ...validProfile, currentFunds: 100000 };
    const errors = validateProfile(profile);
    expect(errors).not.toHaveProperty("currentFunds");
  });

  // ── Multiple errors ────────────────────────────────────────────────────────

  it("collects errors for multiple invalid fields simultaneously", () => {
    const profile: BusinessProfile = {
      ...validProfile,
      companyName: "",
      industry: "",
      currentFunds: 500,
    };
    const errors = validateProfile(profile);
    expect(errors).toHaveProperty("companyName");
    expect(errors).toHaveProperty("industry");
    expect(errors).toHaveProperty("currentFunds");
    // Valid fields should not appear in errors
    expect(errors).not.toHaveProperty("city");
    expect(errors).not.toHaveProperty("targetCustomer");
    expect(errors).not.toHaveProperty("businessStage");
    expect(errors).not.toHaveProperty("businessType");
  });
});
