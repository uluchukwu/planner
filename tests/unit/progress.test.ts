import { describe, it, expect } from "vitest";
import { computeGoalProgress, computeCompletionRate } from "@/lib/progress";

describe("computeGoalProgress", () => {
  it("AUTO with no linked tasks is 0%, not NaN or 100%", () => {
    expect(computeGoalProgress({ progressMode: "AUTO", manualProgress: null, tasks: [] })).toBe(0);
  });

  it("AUTO derives from the completion ratio of linked tasks", () => {
    const tasks = [{ status: "COMPLETED" as const }, { status: "PENDING" as const }, { status: "PENDING" as const }];
    expect(computeGoalProgress({ progressMode: "AUTO", manualProgress: null, tasks })).toBe(33); // 1/3 rounds to 33
  });

  it("AUTO ignores manualProgress entirely, even if set", () => {
    const tasks = [{ status: "COMPLETED" as const }];
    expect(computeGoalProgress({ progressMode: "AUTO", manualProgress: 50, tasks })).toBe(100);
  });

  it("MANUAL always trusts the stored value, including an explicit 0", () => {
    expect(computeGoalProgress({ progressMode: "MANUAL", manualProgress: 0, tasks: [{ status: "COMPLETED" as const }] })).toBe(0);
  });

  it("MANUAL with a null manualProgress defaults to 0, not undefined behavior", () => {
    expect(computeGoalProgress({ progressMode: "MANUAL", manualProgress: null, tasks: [] })).toBe(0);
  });
});

describe("computeCompletionRate", () => {
  it("0 total is 0%, not division-by-zero NaN", () => {
    expect(computeCompletionRate(0, 0)).toBe(0);
  });

  it("rounds to the nearest percent", () => {
    expect(computeCompletionRate(3, 1)).toBe(33);
    expect(computeCompletionRate(3, 2)).toBe(67);
  });

  it("full completion is exactly 100", () => {
    expect(computeCompletionRate(5, 5)).toBe(100);
  });
});
