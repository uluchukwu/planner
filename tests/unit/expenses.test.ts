import { describe, it, expect } from "vitest";
import { computeCategoryBreakdown } from "@/lib/expenses";

describe("computeCategoryBreakdown", () => {
  it("returns an empty list for no expenses", () => {
    expect(computeCategoryBreakdown([])).toEqual([]);
  });

  it("groups by category and sums correctly", () => {
    const result = computeCategoryBreakdown([
      { category: "FOOD", amount: 20 },
      { category: "FOOD", amount: 10 },
      { category: "TRANSPORT", amount: 30 },
    ]);
    const food = result.find((r) => r.category === "FOOD");
    const transport = result.find((r) => r.category === "TRANSPORT");
    expect(food?.total).toBe(30);
    expect(transport?.total).toBe(30);
  });

  it("sorts descending by total", () => {
    const result = computeCategoryBreakdown([
      { category: "FOOD", amount: 10 },
      { category: "TRANSPORT", amount: 90 },
    ]);
    expect(result[0].category).toBe("TRANSPORT");
    expect(result[1].category).toBe("FOOD");
  });

  it("percentages are computed against the grand total, not per-category", () => {
    const result = computeCategoryBreakdown([
      { category: "FOOD", amount: 25 },
      { category: "TRANSPORT", amount: 75 },
    ]);
    const food = result.find((r) => r.category === "FOOD");
    const transport = result.find((r) => r.category === "TRANSPORT");
    expect(food?.pct).toBe(25);
    expect(transport?.pct).toBe(75);
  });
});
