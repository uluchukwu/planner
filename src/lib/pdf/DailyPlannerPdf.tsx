import { Document, Page, View, Text } from "@react-pdf/renderer";
import { pdfStyles, pdfColors } from "@/lib/pdf/theme";
import { TaskCheckboxRow } from "@/lib/pdf/TaskCheckboxRow";
import { PRIORITY_QUADRANT_LABELS } from "@/lib/types";
import { TaskPriority } from "@/generated/prisma/enums";

const QUADRANT_ORDER: TaskPriority[] = [
  "URGENT_IMPORTANT",
  "NOT_URGENT_IMPORTANT",
  "URGENT_NOT_IMPORTANT",
  "NOT_URGENT_NOT_IMPORTANT",
];

export type DailyPdfData = {
  dateLabel: string;
  challenge: string | null;
  objective: string | null;
  quadrants: Record<TaskPriority, { title: string; done: boolean }[]>;
  timeline: { label: string; title: string }[];
  top3: { title: string; done: boolean }[];
  otherTasks: { title: string; done: boolean }[];
};

export function DailyPlannerPdf({ data }: { data: DailyPdfData }) {
  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <Text style={pdfStyles.title}>{data.dateLabel}</Text>
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
          <View style={[pdfStyles.hairlineBox, { flex: 1 }]}>
            <Text style={pdfStyles.sectionLabel}>Today&apos;s challenge</Text>
            <Text style={{ fontSize: 9.5 }}>{data.challenge || "—"}</Text>
          </View>
          <View style={[pdfStyles.hairlineBox, { flex: 1 }]}>
            <Text style={pdfStyles.sectionLabel}>Objective</Text>
            <Text style={{ fontSize: 9.5 }}>{data.objective || "—"}</Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1, gap: 12 }}>
            <View>
              <Text style={pdfStyles.sectionLabel}>Top 3 priorities</Text>
              <View style={pdfStyles.hairlineBox}>
                {data.top3.length === 0 ? (
                  <Text style={pdfStyles.emptyNote}>No priorities chosen.</Text>
                ) : (
                  data.top3.map((t, i) => <TaskCheckboxRow key={i} label={t.title} done={t.done} />)
                )}
              </View>
            </View>

            <View>
              <Text style={pdfStyles.sectionLabel}>Urgent / important</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {QUADRANT_ORDER.map((q) => (
                  <View key={q} style={[pdfStyles.hairlineBox, { width: "48%" }]}>
                    <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: pdfColors.inkSoft, marginBottom: 4 }}>
                      {PRIORITY_QUADRANT_LABELS[q].short}
                    </Text>
                    {data.quadrants[q].length === 0 ? (
                      <Text style={pdfStyles.emptyNote}>—</Text>
                    ) : (
                      data.quadrants[q].map((t, i) => <TaskCheckboxRow key={i} label={t.title} done={t.done} />)
                    )}
                  </View>
                ))}
              </View>
            </View>

            <View>
              <Text style={pdfStyles.sectionLabel}>Other tasks</Text>
              <View style={pdfStyles.hairlineBox}>
                {data.otherTasks.length === 0 ? (
                  <Text style={pdfStyles.emptyNote}>Nothing else scheduled.</Text>
                ) : (
                  data.otherTasks.map((t, i) => <TaskCheckboxRow key={i} label={t.title} done={t.done} />)
                )}
              </View>
            </View>
          </View>

          <View style={{ width: 160 }}>
            <Text style={pdfStyles.sectionLabel}>Timeline</Text>
            <View style={pdfStyles.hairlineBox}>
              {data.timeline.length === 0 ? (
                <Text style={pdfStyles.emptyNote}>Nothing scheduled.</Text>
              ) : (
                data.timeline.map((b, i) => (
                  <View key={i} style={{ flexDirection: "row", marginBottom: 4 }}>
                    <Text style={{ width: 44, fontSize: 8.5, color: pdfColors.inkSoft }}>{b.label}</Text>
                    <Text style={{ fontSize: 9 }}>{b.title}</Text>
                  </View>
                ))
              )}
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
