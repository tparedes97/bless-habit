import { AbsoluteFill, Interactive, interpolate, useCurrentFrame } from "remotion";
import { Sfx } from "../Sfx";
import { calm, clamp, sans, serif } from "../theme";

// Pensamientos que llegan cada vez más rápido
const THOUGHTS = [
  { t: "no tomaste agua 💧", x: 80, y: 260, r: -4 },
  { t: "otra vez no saliste a caminar 🚶", x: 230, y: 470, r: 3 },
  { t: "mañana reunión a las 9 😰", x: 60, y: 690, r: -2 },
  { t: "¿pagaste la luz? 💡", x: 470, y: 900, r: 5 },
  { t: "3 días sin leer 📚", x: 90, y: 1110, r: -5 },
  { t: "contestarle a mamá 📱", x: 420, y: 1300, r: 3 },
  { t: "¿y el gym? 🏋️", x: 120, y: 1490, r: -3 },
  { t: "deberías estar durmiendo ya 😩", x: 200, y: 1680, r: 2 },
];
const AT = [4, 22, 38, 51, 62, 71, 79, 86];
const BEATS = [0, 26, 50, 72, 92];

export const Thoughts: React.FC = () => {
  const f = useCurrentFrame();
  const fadeAll = interpolate(f, [92, 110], [0, 1], { ...clamp, easing: calm });
  const pulse = BEATS.reduce((m, b) => Math.max(m, interpolate(f, [b, b + 3, b + 12], [0, 1, 0], clamp)), 0);
  return (
    <AbsoluteFill>
      {BEATS.map((b) => (
        <Sfx key={b} at={b} name="heartbeat" volume={0.8} />
      ))}
      {AT.map((t, i) => (
        <Sfx key={t} at={t} name="bubble" volume={0.25 + i * 0.03} />
      ))}
      <AbsoluteFill style={{ scale: 1 + pulse * 0.012 }}>
        {THOUGHTS.map((c, i) => {
          const at = AT[i];
          return (
            <div
              key={c.t}
              style={{
                position: "absolute",
                left: c.x + Math.sin(f * 0.4 + i * 2) * 5 * (1 - fadeAll),
                top: c.y + Math.cos(f * 0.35 + i) * 5 * (1 - fadeAll),
                rotate: `${c.r}deg`,
                fontFamily: sans,
                fontWeight: 500,
                fontSize: 46,
                color: "white",
                background: "rgba(255,255,255,0.12)",
                border: "2px solid rgba(255,255,255,0.18)",
                padding: "24px 38px",
                borderRadius: 40,
                whiteSpace: "nowrap",
                opacity: interpolate(f, [at, at + 6], [0, 1], clamp) * (1 - fadeAll),
                scale: interpolate(f, [at, at + 12], [0.7, 1], { ...clamp, easing: calm, output: "perceptual-scale" }),
                filter: `blur(${fadeAll * 16}px)`,
              }}
            >
              {c.t}
            </div>
          );
        })}
      </AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <Interactive.Div
          name="Breathe"
          style={{
            fontFamily: serif,
            fontWeight: 600,
            fontSize: 140,
            color: "white",
            letterSpacing: -2,
            opacity: interpolate(f, [96, 110], [0, 1], { ...clamp, easing: calm }),
            scale: interpolate(f, [96, 150], [0.9, 1.06], { ...clamp, easing: calm, output: "perceptual-scale" }),
          }}
        >
          respira.
        </Interactive.Div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
