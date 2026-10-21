import { AbsoluteFill, Interactive, interpolate, useCurrentFrame } from "remotion";
import { Card, Headline } from "../Headline";
import { C, calm, clamp, sans, serif } from "../theme";

const DAYS = ["L", "M", "M", "J", "V", "S", "D"];
const HEIGHTS = [0.45, 0.6, 0.55, 0.75, 0.7, 0.9, 1];
const MOODS = ["😔", "😐", "🙂", "😊", "😌", "😊", "🤩"];

// Tu semana: la racha crece y el ánimo mejora
export const Growth: React.FC = () => {
  const f = useCurrentFrame();
  const streak = Math.round(interpolate(f, [24, 70], [0, 7], clamp));
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <Headline title="Mira cómo creces." sub="Tu constancia y tu ánimo, juntos." />
      <Card enter={8} style={{ marginTop: 90 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 20 }}>
          <div style={{ fontFamily: serif, fontWeight: 600, fontSize: 130, color: C.violet, lineHeight: 1 }}>
            {streak}
          </div>
          <div style={{ fontFamily: sans, fontSize: 46, color: C.ink, fontWeight: 500 }}>días seguidos 🔥</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", height: 360, marginTop: 40 }}>
          {DAYS.map((d, i) => {
            const at = 20 + i * 7;
            return (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                <Interactive.Div
                  name={`Bar-${i}`}
                  style={{
                    width: 82,
                    height: interpolate(f, [at, at + 26], [0, 300 * HEIGHTS[i]], { ...clamp, easing: calm }),
                    borderRadius: 26,
                    background: `linear-gradient(180deg, ${C.violetSoft}, ${C.mint})`,
                  }}
                />
                <div style={{ fontFamily: sans, fontSize: 36, color: C.muted }}>{d}</div>
              </div>
            );
          })}
        </div>
        <div style={{ height: 3, background: C.line, margin: "40px 0 34px" }} />
        <div style={{ fontFamily: sans, fontSize: 38, color: C.muted, fontWeight: 500, marginBottom: 20 }}>
          Tu ánimo esta semana
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          {MOODS.map((m, i) => {
            const at = 60 + i * 5;
            return (
              <div
                key={i}
                style={{
                  fontSize: 70,
                  width: 82,
                  textAlign: "center",
                  opacity: interpolate(f, [at, at + 10], [0, 1], clamp),
                  scale: interpolate(f, [at, at + 18], [0.4, 1], {
                    ...clamp,
                    easing: calm,
                    output: "perceptual-scale",
                  }),
                }}
              >
                {m}
              </div>
            );
          })}
        </div>
      </Card>
    </AbsoluteFill>
  );
};
