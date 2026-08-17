import { Document, Page, View, Text } from "@react-pdf/renderer";
import { pdfStyles, pdfColors } from "@/lib/pdf/theme";

export type MonthlyPdfGoal = { title: string; progress: number; parentTitle: string | null };

export type MonthlyPdfData = {
  monthLabel: string;
  yearLabel: string;
  monthGoals: MonthlyPdfGoal[];
  yearGoals: MonthlyPdfGoal[];
};

function GoalRow({ goal }: { goal: MonthlyPdfGoal }) {
  return (
    <View style={{ marginBottom: 8 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 9.5 }}>{goal.title}</Text>
        <Text style={{ fontSize: 8.5, color: pdfColors.inkSoft }}>{goal.progress}%</Text>
      </View>
      {goal.parentTitle && <Text style={{ fontSize: 7.5, color: pdfColors.inkFaint }}>from {goal.parentTitle}</Text>}
      <View style={{ height: 3, backgroundColor: "#eeeeee", borderRadius: 1.5, marginTop: 3 }}>
        <View style={{ height: 3, width: `${Math.max(0, Math.min(100, goal.progress))}%`, backgroundColor: pdfColors.ink, borderRadius: 1.5 }} />
      </View>
    </View>
  );
}

export function MonthlyPlannerPdf({ data }: { data: MonthlyPdfData }) {
  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <Text style={pdfStyles.title}>{data.monthLabel}</Text>
        <Text style={pdfStyles.subtitle}>Part of {data.yearLabel}</Text>

        <View style={{ flexDirection: "row", gap: 16 }}>
          <View style={{ flex: 1 }}>
            <Text style={pdfStyles.sectionLabel}>This month&apos;s goals</Text>
            <View style={pdfStyles.hairlineBox}>
              {data.monthGoals.length === 0 ? (
                <Text style={pdfStyles.emptyNote}>No goals set for this month.</Text>
              ) : (
                data.monthGoals.map((g, i) => <GoalRow key={i} goal={g} />)
              )}
            </View>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={pdfStyles.sectionLabel}>{data.yearLabel} goals</Text>
            <View style={pdfStyles.hairlineBox}>
              {data.yearGoals.length === 0 ? (
                <Text style={pdfStyles.emptyNote}>No goals set for this year.</Text>
              ) : (
                data.yearGoals.map((g, i) => <GoalRow key={i} goal={g} />)
              )}
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
