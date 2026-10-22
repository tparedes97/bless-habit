import { AbsoluteFill, Interactive, interpolate, useCurrentFrame } from "remotion";
import { Sfx } from "../Sfx";
import { calm, clamp, sans } from "../theme";

const WORDS = "son las 11:47 pm y tu cerebro decide repasar todo lo que no hiciste hoy 😮‍💨".split(" ");

// Escena 1: la hora de la ansiedad
export const Night: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ alignItems: "center", paddingTop: 300 }}>
      {[0, 15, 30, 45, 60, 75, 90, 105].map((t) => (
        <Sfx key={t} at={t} name="tick" volume={0.35} />
      ))}
      <Interactive.Div
        name="Clock"
        style={{
          fontFamily: sans,
          fontWeight: 400,
          fontSize: 230,
          letterSpacing: -6,
          color: "rgba(255,255,255,0.92)",
          opacity: interpolate(f, [0, 20], [0, 1], { ...clamp, easing: calm }),
        }}
      >
        23:47
      </Interactive.Div>
      <div style={{ fontFamily: sans, fontSize: 44, color: "rgba(255,255,255,0.55)", marginTop: -10, opacity: interpolate(f, [8, 26], [0, 1], clamp) }}>
        martes
      </div>
      <div style={{ padding: "0 90px", marginTop: 220, textAlign: "center" }}>
        <Interactive.Div
          name="POV"
          style={{
            display: "inline-block",
            fontFamily: sans,
            fontWeight: 700,
            fontSize: 64,
            color: "#1C1838",
            background: "white",
            padding: "10px 30px",
            borderRadius: 18,
            marginBottom: 34,
            opacity: interpolate(f, [16, 26], [0, 1], { ...clamp, easing: calm }),
            scale: interpolate(f, [16, 30], [0.8, 1], { ...clamp, easing: calm, output: "perceptual-scale" }),
          }}
        >
          POV:
        </Interactive.Div>
        <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 78, lineHeight: 1.22, color: "white" }}>
          {WORDS.map((w, i) => {
            const at = 28 + i * 4;
            return (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  marginRight: 20,
                  opacity: interpolate(f, [at, at + 8], [0, 1], clamp),
                  translate: interpolate(f, [at, at + 12], ["0px 20px", "0px 0px"], { ...clamp, easing: calm }),
                }}
              >
                {w}
              </span>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
