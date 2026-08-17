import { describe, it, expect } from "vitest";
import {
  addDays,
  weekdayOf,
  getWeekStart,
  getWeekEnd,
  getWeekDays,
  orderedWeekdays,
  daysElapsedInMonth,
  shiftMonthKey,
  dateToKey,
} from "@/lib/date/week";

describe("addDays", () => {
  it("crosses a month boundary", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
  });

  it("crosses a year boundary", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("handles negative offsets", () => {
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("handles a leap-year Feb 29", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2028-02-29", 1)).toBe("2028-03-01");
  });
});

describe("weekdayOf", () => {
  it("identifies a known Monday", () => {
    // 2026-08-17 is a Monday
    expect(weekdayOf("2026-08-17")).toBe("MONDAY");
  });

  it("identifies a known Sunday", () => {
    expect(weekdayOf("2026-08-23")).toBe("SUNDAY");
  });
});

describe("getWeekStart / getWeekEnd / getWeekDays", () => {
  it("returns the same Monday-start week regardless of which day within it is queried", () => {
    for (const key of ["2026-08-17", "2026-08-19", "2026-08-23"]) {
      expect(getWeekStart(key, "MONDAY")).toBe("2026-08-17");
      expect(getWeekEnd(key, "MONDAY")).toBe("2026-08-23");
    }
  });

  it("shifts the week boundary when weekStartsOn changes", () => {
    // For a Wednesday (2026-08-19), a SUNDAY-start week begins the previous Sunday.
    expect(getWeekStart("2026-08-19", "SUNDAY")).toBe("2026-08-16");
  });

  it("returns exactly 7 consecutive dateKeys starting at the week start", () => {
    const days = getWeekDays("2026-08-19", "MONDAY");
    expect(days).toHaveLength(7);
    expect(days[0]).toBe("2026-08-17");
    expect(days[6]).toBe("2026-08-23");
    for (let i = 1; i < 7; i++) {
      expect(days[i]).toBe(addDays(days[i - 1], 1));
    }
  });
});

describe("orderedWeekdays", () => {
  it("starts the 7-day label list from the given weekday", () => {
    const order = orderedWeekdays("WEDNESDAY");
    expect(order[0]).toBe("WEDNESDAY");
    expect(order).toHaveLength(7);
    expect(new Set(order).size).toBe(7); // all 7 distinct, none dropped or duplicated
  });
});

describe("daysElapsedInMonth", () => {
  it("is inclusive of both the 1st and the given day", () => {
    expect(daysElapsedInMonth("2026-08-05")).toEqual([
      "2026-08-01",
      "2026-08-02",
      "2026-08-03",
      "2026-08-04",
      "2026-08-05",
    ]);
  });

  it("returns just the 1st when queried on the 1st", () => {
    expect(daysElapsedInMonth("2026-08-01")).toEqual(["2026-08-01"]);
  });
});

describe("shiftMonthKey", () => {
  it("rolls over a year boundary going forward", () => {
    expect(shiftMonthKey("2026-12", 1)).toBe("2027-01");
  });

  it("rolls back over a year boundary", () => {
    expect(shiftMonthKey("2026-01", -1)).toBe("2025-12");
  });

  it("is a no-op for delta 0", () => {
    expect(shiftMonthKey("2026-06", 0)).toBe("2026-06");
  });
});

describe("dateToKey", () => {
  it("pads single-digit months and days", () => {
    expect(dateToKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});
