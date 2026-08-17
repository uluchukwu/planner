import { View, Text } from "@react-pdf/renderer";
import { pdfStyles } from "@/lib/pdf/theme";

export function TaskCheckboxRow({ label, done }: { label: string; done?: boolean }) {
  return (
    <View style={pdfStyles.taskRow}>
      <View style={done ? [pdfStyles.checkbox, pdfStyles.checkboxChecked] : pdfStyles.checkbox} />
      <Text style={done ? [pdfStyles.taskLabel, pdfStyles.taskLabelDone] : pdfStyles.taskLabel}>{label}</Text>
    </View>
  );
}
