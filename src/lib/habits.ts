import { addDays } from "@/lib/date/week";

// Streak = consecutive calendar days with a completion, counting backward from today.
// If today isn't done yet, the streak still counts through yesterday — the streak
// only breaks once a day is skipped, not the moment today hasn't happened yet.
export function computeCurrentStreak(completionDates: Set<string>, todayKey: string): number {
  let streak = 0;
  let cursor = completionDates.has(todayKey) ? todayKey : addDays(todayKey, -1);
  while (completionDates.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function countCompletionsInRange(completionDates: Set<string>, dateKeys: string[]): number {
  return dateKeys.filter((key) => completionDates.has(key)).length;
}
