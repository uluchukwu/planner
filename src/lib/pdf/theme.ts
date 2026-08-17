import { StyleSheet } from "@react-pdf/renderer";

// "High-contrast, low-ink" per the roadmap: black text and hairline strokes on white,
// no filled color backgrounds (the live app's accent/priority colors don't survive a
// black-and-white printer, and filled boxes waste toner on a page meant to be reprinted weekly).
export const pdfColors = {
  ink: "#111111",
  inkSoft: "#555555",
  inkFaint: "#888888",
  hairline: "#cccccc",
};

export const pdfStyles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: pdfColors.ink,
  },
  title: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 10,
    color: pdfColors.inkSoft,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: pdfColors.inkSoft,
    marginBottom: 6,
  },
  hairlineBox: {
    borderWidth: 1,
    borderColor: pdfColors.hairline,
    borderRadius: 2,
    padding: 8,
  },
  row: {
    flexDirection: "row",
  },
  checkbox: {
    width: 8,
    height: 8,
    borderWidth: 1,
    borderColor: pdfColors.ink,
    marginRight: 6,
    marginTop: 1.5,
  },
  checkboxChecked: {
    backgroundColor: pdfColors.ink,
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  taskLabel: {
    fontSize: 9.5,
  },
  taskLabelDone: {
    color: pdfColors.inkFaint,
    textDecoration: "line-through",
  },
  emptyNote: {
    fontSize: 9,
    color: pdfColors.inkFaint,
    fontStyle: "italic",
  },
});
