import { AbsoluteFill, Interactive, interpolate, useCurrentFrame } from "remotion";
import { Card, Headline } from "../Headline";
import { C, calm, clamp, sans, serif } from "../theme";
import { Sfx } from "../Sfx";

const HABITS = [
  { e: "🧘", time: "06:30", name: "Meditar" },
  { e: "🚶", time: "07:00", name: "Caminar" },
  { e: "💧", time: "10:00", name: "Tomar agua" },
  { e: "📚", time: "21:00", name: "Leer" },
];
const CHECK_AT = [38, 58, 78, 98];

// La agenda del día: cada hábito se marca y el anillo se completa
export const Agenda: React.FC = () => {
  const f = useCurrentFrame();
  const progress = interpolate(
    f,
    [38, 50, 58, 70, 78, 90, 98, 110],
    [0, 0.25, 0.25, 0.5, 0.5, 0.75, 0.75, 1],
    { ...clamp, easing: calm },
  );
  const done = CHECK_AT.filter((t) => f >= t).length;
  const R = 62;
  const circ = 2 * Math.PI * R;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      {CHECK_AT.map((t, i) => (
        <Sfx key={t} at={t} name={`note-${i + 1}`} volume={0.45} />
      ))}
      <Headline title="Tu día, en orden." sub="Hábitos con hora, a tu ritmo." />
      <Card enter={8} style={{ marginTop: 90 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 30 }}>
          <div>
            <div style={{ fontFamily: serif, fontWeight: 600, fontSize: 64, color: C.ink }}>Hoy</div>
            <div style={{ fontFamily: sans, fontSize: 38, color: C.mint, fontWeight: 500 }}>
              {Math.round(progress * 100)}% cumplido
            </div>
          </div>
          <div style={{ position: "relative", width: 160, height: 160 }}>
            <svg width={160} height={160} style={{ rotate: "-90deg" }}>
              <circle cx={80} cy={80} r={R} stroke={C.line} strokeWidth={16} fill="none" />
              <circle
                cx={80}
                cy={80}
                r={R}
                stroke={C.mint}
                strokeWidth={16}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={circ * (1 - progress)}
              />
            </svg>
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: sans,
                fontWeight: 700,
                fontSize: 44,
                color: C.mint,
              }}
            >
              {done}/4
            </div>
          </div>
        </div>
        {HABITS.map((h, i) => {
          const t = CHECK_AT[i];
          const on = interpolate(f, [t, t + 12], [0, 1], { ...clamp, easing: calm });
          return (
            <Interactive.Div
              key={h.name}
              name={`Habit-${h.name}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 28,
                padding: "30px 32px",
                marginTop: 22,
                borderRadius: 36,
                border: `3px solid ${C.line}`,
                background: on > 0.5 ? "#F4FCF8" : "white",
                opacity: interpolate(f, [16 + i * 5, 30 + i * 5], [0, 1], { ...clamp, easing: calm }),
                translate: interpolate(f, [16 + i * 5, 40 + i * 5], ["0px 30px", "0px 0px"], {
                  ...clamp,
                  easing: calm,
                }),
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  border: `4px solid ${on > 0 ? C.mint : C.line}`,
                  background: on > 0 ? C.mint : "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: 38,
                  fontWeight: 700,
                  fontFamily: sans,
                  scale: 1 + Math.sin(on * Math.PI) * 0.18,
                }}
              >
                <span style={{ opacity: on }}>✓</span>
              </div>
              <div style={{ fontSize: 50 }}>{h.e}</div>
              <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 42, color: C.mint }}>{h.time}</div>
              <div
                style={{
                  fontFamily: sans,
                  fontSize: 46,
                  color: on > 0.5 ? "#7FCFAF" : C.ink,
                  textDecoration: on > 0.5 ? "line-through" : "none",
                }}
              >
                {h.name}
              </div>
            </Interactive.Div>
          );
        })}
      </Card>
    </AbsoluteFill>
  );
};
