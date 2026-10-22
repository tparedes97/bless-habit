import { AbsoluteFill, Interactive, interpolate, useCurrentFrame } from "remotion";
import { Sfx } from "../Sfx";
import { LogoTile } from "../Sprout";
import { C, calm, clamp, sans, serif } from "../theme";

// Escena 4: amanece y Bless te recuerda con calma
export const Morning: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ alignItems: "center", paddingTop: 300 }}>
      <Sfx at={26} name="chime" volume={0.5} />
      <Sfx at={64} name="note-4" volume={0.3} />
      <div
        style={{
          position: "absolute",
          width: 700,
          height: 700,
          left: 190,
          top: -260,
          borderRadius: "50%",
          background: "#FFD9A8",
          filter: "blur(140px)",
          opacity: interpolate(f, [0, 60], [0, 0.7], clamp),
        }}
      />
      <Interactive.Div
        name="Clock"
        style={{
          fontFamily: sans,
          fontWeight: 400,
          fontSize: 230,
          letterSpacing: -6,
          color: C.ink,
          opacity: interpolate(f, [0, 18], [0, 1], { ...clamp, easing: calm }),
        }}
      >
        7:00
      </Interactive.Div>
      <div style={{ fontFamily: sans, fontSize: 44, color: C.muted, marginTop: -10 }}>miércoles</div>
      <Interactive.Div
        name="Notification"
        style={{
          marginTop: 120,
          width: 920,
          display: "flex",
          gap: 30,
          alignItems: "center",
          background: "rgba(255,255,255,0.9)",
          borderRadius: 48,
          padding: "34px 38px",
          boxSizing: "border-box",
          boxShadow: "0 30px 80px rgba(76,60,160,0.18)",
          opacity: interpolate(f, [24, 36], [0, 1], { ...clamp, easing: calm }),
          translate: interpolate(f, [24, 46], ["0px -80px", "0px 0px"], { ...clamp, easing: calm }),
        }}
      >
        <LogoTile size={110} progress={1} />
        <div>
          <div style={{ fontFamily: sans, fontSize: 32, color: C.muted }}>Bless Habit · ahora</div>
          <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 44, color: C.ink, marginTop: 6 }}>Buenos días 🌤️</div>
          <div style={{ fontFamily: sans, fontSize: 40, color: C.ink, marginTop: 4 }}>Hora de caminar 🚶 · 20 min</div>
        </div>
      </Interactive.Div>
      <Interactive.Div
        name="Line"
        style={{
          marginTop: 150,
          fontFamily: serif,
          fontWeight: 600,
          fontSize: 96,
          lineHeight: 1.1,
          letterSpacing: -1.5,
          textAlign: "center",
          color: C.ink,
          padding: "0 90px",
          opacity: interpolate(f, [62, 80], [0, 1], { ...clamp, easing: calm }),
          translate: interpolate(f, [62, 90], ["0px 30px", "0px 0px"], { ...clamp, easing: calm }),
        }}
      >
        Y por fin dormiste en paz.
      </Interactive.Div>
    </AbsoluteFill>
  );
};
