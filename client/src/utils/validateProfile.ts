/**
 * Business profile form validation utility
 * Requirements: 1.5
 *
 * Validates a BusinessProfile object and returns a map of field names to
 * error messages for any invalid required fields.
 * Returns an empty object `{}` if all required fields are valid.
 */
import type { BusinessProfile } from "../types";

/**
 * Validates the required fields of a BusinessProfile.
 *
 * Required fields:
 *   - companyName   — must be non-empty string
 *   - industry      — must be non-empty string
 *   - city          — must be non-empty string
 *   - targetCustomer — must be non-empty string
 *   - currentFunds  — must be a number >= 1000
 *   - businessStage — must be non-empty string
 *   - businessType  — must be non-empty string
 *
 * Optional fields (not validated):
 *   - mainGoal
 *
 * @param profile - The BusinessProfile to validate
 * @returns A Record mapping field names to error messages; empty if all valid
 */
export function validateProfile(
  profile: BusinessProfile
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!profile.companyName || profile.companyName.trim() === "") {
    errors.companyName = "Company name is required.";
  }

  if (!profile.industry || profile.industry.trim() === "") {
    errors.industry = "Industry or niche is required.";
  }

  if (!profile.city || profile.city.trim() === "") {
    errors.city = "City or state is required.";
  }

  if (!profile.targetCustomer || profile.targetCustomer.trim() === "") {
    errors.targetCustomer = "Target customer is required.";
  }

  if (
    profile.currentFunds === undefined ||
    profile.currentFunds === null ||
    isNaN(profile.currentFunds) ||
    profile.currentFunds < 1000
  ) {
    errors.currentFunds = "Current funds must be at least RM 1,000.";
  }

  if (!profile.businessStage || profile.businessStage.trim() === "") {
    errors.businessStage = "Business stage is required.";
  }

  if (!profile.businessType || profile.businessType.trim() === "") {
    errors.businessType = "Business type is required.";
  }

  return errors;
}
