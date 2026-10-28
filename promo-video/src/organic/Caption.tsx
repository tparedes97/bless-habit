import { interpolate, useCurrentFrame } from "remotion";
import { sans } from "../theme";

// Texto estilo Instagram: cajas blancas redondeadas con letra negra
export const Caption: React.FC<{ lines: string[]; from: number; to?: number; y?: number; size?: number }> = ({
  lines,
  from,
  to = Infinity,
  y = 250,
  size = 58,
}) => {
  const f = useCurrentFrame();
  if (f < from || f >= to) return null;
  const pop = interpolate(f, [from, from + 5, from + 9], [0.7, 1.06, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div
      style={{
        position: "absolute",
        top: y,
        left: 120,
        right: 120,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        scale: pop,
      }}
    >
      {lines.map((l, i) => (
        <div
          key={i}
          style={{
            fontFamily: sans,
            fontWeight: 700,
            fontSize: size,
            lineHeight: 1.15,
            color: "#111",
            background: "white",
            padding: "10px 26px 14px",
            borderRadius: 18,
            marginTop: i === 0 ? 0 : -8,
            textAlign: "center",
            boxShadow: "0 6px 20px rgba(0,0,0,0.12)",
          }}
        >
          {l}
        </div>
      ))}
    </div>
  );
};
