import { describe, it, expect } from "vitest";
import { formatCurrency } from "@/lib/format";

describe("formatCurrency", () => {
  it("formats a valid ISO currency code", () => {
    expect(formatCurrency(19.99, "USD")).toContain("19.99");
  });

  it("falls back to a plain rendering instead of throwing on an invalid code", () => {
    // Settings' currency field is free-typed, not validated against the real ISO list.
    expect(() => formatCurrency(10, "XXX_NOT_REAL")).not.toThrow();
    expect(formatCurrency(10, "XXX_NOT_REAL")).toContain("10.00");
  });
});
