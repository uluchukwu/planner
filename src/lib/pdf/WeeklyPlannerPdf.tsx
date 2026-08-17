import { Document, Page, View, Text } from "@react-pdf/renderer";
import { pdfStyles, pdfColors } from "@/lib/pdf/theme";
import { TaskCheckboxRow } from "@/lib/pdf/TaskCheckboxRow";

export type WeeklyPdfData = {
  weekLabel: string;
  priorityGoals: { rank: number; title: string; progress: number }[];
  days: { label: string; sublabel: string; tasks: { title: string; done: boolean }[] }[];
  checklist: { label: string; done: boolean }[];
  habits: { name: string; weekDots: boolean[] }[];
};

export function WeeklyPlannerPdf({ data }: { data: WeeklyPdfData }) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={pdfStyles.page}>
        <Text style={pdfStyles.title}>Week of {data.weekLabel}</Text>

        <View style={{ marginBottom: 12 }}>
          <Text style={pdfStyles.sectionLabel}>Priority goals</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {data.priorityGoals.length === 0 ? (
              <Text style={pdfStyles.emptyNote}>No priority goals chosen this week.</Text>
            ) : (
              data.priorityGoals.map((g) => (
                <View key={g.rank} style={[pdfStyles.hairlineBox, { flex: 1, flexDirection: "row", alignItems: "center", gap: 6 }]}>
                  <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold" }}>{g.rank}.</Text>
                  <Text style={{ fontSize: 9, flex: 1 }}>{g.title}</Text>
                  <Text style={{ fontSize: 8, color: pdfColors.inkSoft }}>{g.progress}%</Text>
                </View>
              ))
            )}
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 6, marginBottom: 12 }}>
          {data.days.map((d, i) => (
            <View key={i} style={[pdfStyles.hairlineBox, { flex: 1, minHeight: 160 }]}>
              <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold" }}>{d.label}</Text>
              <Text style={{ fontSize: 7.5, color: pdfColors.inkSoft, marginBottom: 5 }}>{d.sublabel}</Text>
              {d.tasks.length === 0 ? (
                <Text style={pdfStyles.emptyNote}>—</Text>
              ) : (
                d.tasks.map((t, j) => <TaskCheckboxRow key={j} label={t.title} done={t.done} />)
              )}
            </View>
          ))}
        </View>

        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={pdfStyles.sectionLabel}>Weekly checklist</Text>
            <View style={pdfStyles.hairlineBox}>
              {data.checklist.length === 0 ? (
                <Text style={pdfStyles.emptyNote}>Empty.</Text>
              ) : (
                data.checklist.map((c, i) => <TaskCheckboxRow key={i} label={c.label} done={c.done} />)
              )}
            </View>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={pdfStyles.sectionLabel}>Habit tracker</Text>
            <View style={pdfStyles.hairlineBox}>
              {data.habits.length === 0 ? (
                <Text style={pdfStyles.emptyNote}>No active habits.</Text>
              ) : (
                data.habits.map((h, i) => (
                  <View key={i} style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                    <Text style={{ fontSize: 9, width: 90 }}>{h.name}</Text>
                    <View style={{ flexDirection: "row", gap: 4 }}>
                      {h.weekDots.map((done, j) => (
                        <View key={j} style={done ? [pdfStyles.checkbox, pdfStyles.checkboxChecked, { marginRight: 0 }] : [pdfStyles.checkbox, { marginRight: 0 }]} />
                      ))}
                    </View>
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
