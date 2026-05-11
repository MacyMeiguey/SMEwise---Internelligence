/**
 * Unit tests for the RM currency formatter utility
 * Requirements: 1.3, 7.3, 9.3, 13.3, 15.3, 22.4
 */
import { describe, it, expect } from "vitest";
import { formatRM } from "./formatRM";

describe("formatRM", () => {
  it("formats a whole number with two decimal places", () => {
    expect(formatRM(1200)).toBe("RM 1,200.00");
  });

  it("formats a large number with comma separators", () => {
    expect(formatRM(50000)).toBe("RM 50,000.00");
  });

  it("formats a value with cents", () => {
    expect(formatRM(1200.5)).toBe("RM 1,200.50");
  });

  it("formats zero", () => {
    expect(formatRM(0)).toBe("RM 0.00");
  });

  it("formats the minimum valid fund value (1000)", () => {
    expect(formatRM(1000)).toBe("RM 1,000.00");
  });

  it("formats the maximum valid fund value (999999999)", () => {
    expect(formatRM(999999999)).toBe("RM 999,999,999.00");
  });

  it("rounds to two decimal places", () => {
    expect(formatRM(1.005)).toBe("RM 1.01");
  });

  it("output always starts with 'RM '", () => {
    expect(formatRM(42)).toMatch(/^RM /);
  });

  it("output matches the expected pattern", () => {
    const pattern = /^RM [0-9,]+\.[0-9]{2}$/;
    expect(formatRM(1234567.89)).toMatch(pattern);
  });
});
