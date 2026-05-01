"use client";

interface SecurityGradeProps {
  grade: "A" | "B" | "C" | "D" | "F" | "?";
  size?: "sm" | "md" | "lg";
}

const gradeColors: Record<string, { text: string; bg: string; border: string }> = {
  A: { text: "#3A7A3E", bg: "rgba(58,122,62,0.08)", border: "rgba(58,122,62,0.2)" },
  B: { text: "#5C7A3E", bg: "rgba(92,122,62,0.08)", border: "rgba(92,122,62,0.2)" },
  C: { text: "#C47A20", bg: "rgba(196,122,32,0.08)", border: "rgba(196,122,32,0.2)" },
  D: { text: "#C94040", bg: "rgba(201,64,64,0.08)", border: "rgba(201,64,64,0.2)" },
  F: { text: "#C94040", bg: "rgba(201,64,64,0.12)", border: "rgba(201,64,64,0.3)" },
  "?": { text: "#8A9070", bg: "rgba(138,144,112,0.06)", border: "rgba(138,144,112,0.15)" },
};

const sizes = {
  sm: { box: 36, font: 16 },
  md: { box: 52, font: 24 },
  lg: { box: 72, font: 36 },
};

export default function SecurityGrade({ grade, size = "md" }: SecurityGradeProps) {
  const colors = gradeColors[grade] || gradeColors["?"];
  const dim = sizes[size];

  return (
    <div
      style={{
        width: dim.box,
        height: dim.box,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "var(--radius-md)",
        border: `1.5px solid ${colors.border}`,
        background: colors.bg,
        fontFamily: "var(--font-display), Sora, sans-serif",
        fontSize: dim.font,
        fontWeight: 800,
        color: colors.text,
        letterSpacing: "-0.02em",
        flexShrink: 0,
      }}
      title={`Security Grade: ${grade}`}
      aria-label={`Security grade ${grade}`}
    >
      {grade}
    </div>
  );
}
