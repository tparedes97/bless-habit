import { AbsoluteFill, Interactive, interpolate, useCurrentFrame } from "remotion";
import { LogoTile } from "../Sprout";
import { C, calm, clamp, sans, serif } from "../theme";
import { Sfx } from "../Sfx";

const WORDS = [
  { w: "Calma.", at: 6, color: C.ink },
  { w: "Constancia.", at: 22, color: C.ink },
  { w: "Control.", at: 38, color: C.violet },
];

// Cierre: la promesa de marca y la llamada a descargar
export const Cta: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <Sfx at={62} name="sparkle" volume={0.55} />
      <Sfx at={82} name="bubble" volume={0.35} />
      {WORDS.map(({ w, at, color }) => (
        <Interactive.Div
          key={w}
          name={`Word-${w}`}
          style={{
            fontFamily: serif,
            fontWeight: 600,
            fontSize: 132,
            letterSpacing: -3,
            lineHeight: 1.12,
            color,
            opacity: interpolate(f, [at, at + 16], [0, 1], { ...clamp, easing: calm }),
            translate: interpolate(f, [at, at + 28], ["0px 40px", "0px 0px"], { ...clamp, easing: calm }),
            filter: `blur(${interpolate(f, [at, at + 18], [10, 0], clamp)}px)`,
          }}
        >
          {w}
        </Interactive.Div>
      ))}
      <Interactive.Div
        name="Brand"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 30,
          marginTop: 110,
          opacity: interpolate(f, [62, 80], [0, 1], { ...clamp, easing: calm }),
          translate: interpolate(f, [62, 90], ["0px 30px", "0px 0px"], { ...clamp, easing: calm }),
        }}
      >
        <LogoTile size={130} progress={interpolate(f, [62, 100], [0, 1], { ...clamp, easing: calm })} />
        <div style={{ fontFamily: serif, fontWeight: 600, fontSize: 84, color: C.ink, letterSpacing: -1 }}>
          Bless Habit
        </div>
      </Interactive.Div>
      <Interactive.Div
        name="Button"
        style={{
          marginTop: 70,
          fontFamily: sans,
          fontWeight: 700,
          fontSize: 48,
          color: "white",
          background: "linear-gradient(135deg, #7C62F5, #8B6CF6)",
          padding: "36px 64px",
          borderRadius: 999,
          boxShadow: "0 24px 60px rgba(124,98,245,0.4)",
          opacity: interpolate(f, [80, 96], [0, 1], { ...clamp, easing: calm }),
          scale:
            interpolate(f, [80, 104], [0.85, 1], { ...clamp, easing: calm, output: "perceptual-scale" }) *
            (1 + Math.max(0, Math.sin((f - 104) / 9)) * 0.03 * (f > 104 ? 1 : 0)),
        }}
      >
        Descárgala gratis ▸
      </Interactive.Div>
      <Interactive.Div
        name="Store"
        style={{
          marginTop: 30,
          fontFamily: sans,
          fontSize: 44,
          color: C.muted,
          opacity: interpolate(f, [92, 108], [0, 1], { ...clamp, easing: calm }),
        }}
      >
        en Google Play
      </Interactive.Div>
    </AbsoluteFill>
  );
};
