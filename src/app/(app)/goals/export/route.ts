import { renderToBuffer } from "@react-pdf/renderer";
import { getCurrentUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { formatMonthLabel, todayKey } from "@/lib/date/week";
import { computeGoalProgress } from "@/lib/progress";
import { MonthlyPlannerPdf, MonthlyPdfData } from "@/lib/pdf/MonthlyPlannerPdf";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  const url = new URL(req.url);
  const monthKey = url.searchParams.get("month") ?? todayKey().slice(0, 7);
  const year = Number(url.searchParams.get("year") ?? monthKey.slice(0, 4));

  const [monthGoals, yearGoals] = await Promise.all([
    db.goal.findMany({
      where: { userId: user.id, level: "MONTH", monthKey },
      include: { tasks: { select: { status: true } }, parent: { select: { title: true } } },
      orderBy: { createdAt: "asc" },
    }),
    db.goal.findMany({
      where: { userId: user.id, level: "YEAR", yearKey: year },
      include: { tasks: { select: { status: true } } },
      orderBy: [{ isPriority: "desc" }, { createdAt: "asc" }],
    }),
  ]);

  const data: MonthlyPdfData = {
    monthLabel: formatMonthLabel(monthKey),
    yearLabel: String(year),
    monthGoals: monthGoals.map((g) => ({ title: g.title, progress: computeGoalProgress(g), parentTitle: g.parent?.title ?? null })),
    yearGoals: yearGoals.map((g) => ({ title: g.title, progress: computeGoalProgress(g), parentTitle: null })),
  };

  const buffer = await renderToBuffer(MonthlyPlannerPdf({ data }));
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="planner-month-${monthKey}.pdf"`,
    },
  });
}
