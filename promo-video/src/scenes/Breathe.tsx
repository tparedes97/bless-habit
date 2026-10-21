import { AbsoluteFill, Interactive, interpolate, useCurrentFrame } from "remotion";
import { LogoTile } from "../Sprout";
import { C, calm, clamp, sans, serif } from "../theme";

// Anillos que respiran y el brote que crece: el logo aparece
export const Breathe: React.FC = () => {
  const f = useCurrentFrame();
  const breath = (Math.sin(f / 14) + 1) / 2;
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ position: "relative", width: 300, height: 300, marginTop: -120 }}>
        {[0, 1, 2].map((i) => {
          const size = 460 + i * 220;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: 150 - size / 2,
                top: 150 - size / 2,
                width: size,
                height: size,
                borderRadius: "50%",
                border: `3px solid ${C.violet}`,
                opacity: interpolate(f, [i * 6, i * 6 + 30], [0, 0.2 - i * 0.05], clamp),
                scale: 0.92 + breath * 0.08 + i * 0.01,
              }}
            />
          );
        })}
        <Interactive.Div
          name="Logo"
          style={{
            position: "absolute",
            scale: interpolate(f, [0, 30], [0.6, 1], {
              ...clamp,
              easing: calm,
              output: "perceptual-scale",
            }),
            opacity: interpolate(f, [0, 14], [0, 1], clamp),
          }}
        >
          <LogoTile size={300} progress={interpolate(f, [8, 55], [0, 1], { ...clamp, easing: calm })} />
        </Interactive.Div>
      </div>
      <Interactive.Div
        name="Brand"
        style={{
          fontFamily: serif,
          fontWeight: 600,
          fontSize: 120,
          letterSpacing: -2,
          color: C.ink,
          marginTop: 90,
          opacity: interpolate(f, [30, 50], [0, 1], { ...clamp, easing: calm }),
          translate: interpolate(f, [30, 58], ["0px 30px", "0px 0px"], { ...clamp, easing: calm }),
        }}
      >
        Bless Habit
      </Interactive.Div>
      <Interactive.Div
        name="Tagline"
        style={{
          fontFamily: sans,
          fontSize: 48,
          color: C.muted,
          marginTop: 18,
          opacity: interpolate(f, [44, 64], [0, 1], { ...clamp, easing: calm }),
        }}
      >
        Hábitos sin presión 🌱
      </Interactive.Div>
    </AbsoluteFill>
  );
};
