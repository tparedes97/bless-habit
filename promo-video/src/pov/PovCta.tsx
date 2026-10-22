import { AbsoluteFill, Interactive, interpolate, useCurrentFrame } from "remotion";
import { Sfx } from "../Sfx";
import { LogoTile } from "../Sprout";
import { C, calm, clamp, sans, serif } from "../theme";

const LINES = [
  { w: "Tu mente descansa.", at: 4, color: C.ink },
  { w: "Bless se acuerda.", at: 24, color: C.violet },
];

// Escena 5: cierre y llamada a descargar
export const PovCta: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <Sfx at={52} name="sparkle" volume={0.55} />
      <Sfx at={74} name="bubble" volume={0.35} />
      {LINES.map(({ w, at, color }) => (
        <Interactive.Div
          key={w}
          name={w}
          style={{
            fontFamily: serif,
            fontWeight: 600,
            fontSize: 108,
            letterSpacing: -2.5,
            lineHeight: 1.15,
            color,
            textAlign: "center",
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
          opacity: interpolate(f, [52, 70], [0, 1], { ...clamp, easing: calm }),
          translate: interpolate(f, [52, 80], ["0px 30px", "0px 0px"], { ...clamp, easing: calm }),
        }}
      >
        <LogoTile size={130} progress={interpolate(f, [52, 90], [0, 1], { ...clamp, easing: calm })} />
        <div style={{ fontFamily: serif, fontWeight: 600, fontSize: 84, color: C.ink, letterSpacing: -1 }}>Bless Habit</div>
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
          opacity: interpolate(f, [72, 88], [0, 1], { ...clamp, easing: calm }),
          scale: interpolate(f, [72, 96], [0.85, 1], { ...clamp, easing: calm, output: "perceptual-scale" }),
        }}
      >
        Descárgala gratis ▸
      </Interactive.Div>
      <div style={{ marginTop: 30, fontFamily: sans, fontSize: 44, color: C.muted, opacity: interpolate(f, [84, 100], [0, 1], clamp) }}>
        en Google Play
      </div>
    </AbsoluteFill>
  );
};
