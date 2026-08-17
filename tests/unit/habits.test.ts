import { describe, it, expect } from "vitest";
import { computeCurrentStreak, countCompletionsInRange } from "@/lib/habits";

describe("computeCurrentStreak", () => {
  it("counts today when it's already completed", () => {
    const dates = new Set(["2026-08-15", "2026-08-16", "2026-08-17"]);
    expect(computeCurrentStreak(dates, "2026-08-17")).toBe(3);
  });

  it("counts through yesterday when today isn't done yet, without breaking the streak", () => {
    const dates = new Set(["2026-08-15", "2026-08-16"]);
    expect(computeCurrentStreak(dates, "2026-08-17")).toBe(2);
  });

  it("a gap stops the count at the gap, not before it", () => {
    const dates = new Set(["2026-08-10", "2026-08-16", "2026-08-17"]); // 08-10 is disconnected
    expect(computeCurrentStreak(dates, "2026-08-17")).toBe(2);
  });

  it("no completions at all is a 0 streak", () => {
    expect(computeCurrentStreak(new Set(), "2026-08-17")).toBe(0);
  });

  it("a single stale completion (not today, not yesterday) is a 0 streak", () => {
    const dates = new Set(["2026-08-10"]);
    expect(computeCurrentStreak(dates, "2026-08-17")).toBe(0);
  });
});

describe("countCompletionsInRange", () => {
  it("counts only the dates that fall within the given range", () => {
    const dates = new Set(["2026-08-01", "2026-08-15", "2026-09-01"]);
    const range = ["2026-08-01", "2026-08-02", "2026-08-15"];
    expect(countCompletionsInRange(dates, range)).toBe(2);
  });

  it("an empty range is 0, not an error", () => {
    expect(countCompletionsInRange(new Set(["2026-08-01"]), [])).toBe(0);
  });
});
