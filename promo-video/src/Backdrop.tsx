import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C } from "./theme";

// Fondo lavanda con manchas de luz que flotan muy despacio
export const Backdrop: React.FC = () => {
  const f = useCurrentFrame();
  const blob = (
    color: string,
    size: number,
    x: number,
    y: number,
    speed: number,
    phase: number,
  ) => (
    <div
      style={{
        position: "absolute",
        width: size,
        height: size,
        left: x + Math.sin(f * speed + phase) * 60,
        top: y + Math.cos(f * speed * 0.8 + phase) * 80,
        borderRadius: "50%",
        background: color,
        filter: "blur(120px)",
        opacity: 0.55,
      }}
    />
  );
  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(170deg, #FAFAFD 0%, #F1EEFC 55%, #EAF8F2 100%)",
        overflow: "hidden",
      }}
    >
      {blob(C.violetSoft, 760, -220, 120, 0.012, 0)}
      {blob(C.mintSoft, 820, 420, 1180, 0.01, 2)}
      {blob("#D9D2FF", 600, 560, 520, 0.014, 4)}
    </AbsoluteFill>
  );
};
