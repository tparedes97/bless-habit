import { AbsoluteFill, Interactive, interpolate, useCurrentFrame } from "remotion";
import { C, calm, clamp, sans, serif } from "../theme";
import { Sfx } from "../Sfx";

// El caos del día: pendientes que se agitan y luego se disuelven
const CHIPS = [
  { t: "📧 23 correos sin leer", x: 90, y: 260, r: -6 },
  { t: "⏰ Reunión 9:00", x: 560, y: 420, r: 5 },
  { t: "🛒 Comprar leche", x: 120, y: 620, r: 3 },
  { t: "💡 ¿Pagaste la luz?", x: 470, y: 1300, r: -4 },
  { t: "🏃 Ir al gym", x: 110, y: 1480, r: 6 },
  { t: "📱 47 notificaciones", x: 420, y: 1660, r: -3 },
];

export const Hook: React.FC = () => {
  const f = useCurrentFrame();
  const settle = interpolate(f, [58, 90], [0, 1], { ...clamp, easing: calm });
  return (
    <AbsoluteFill>
      <Sfx at={2} name="bubble" volume={0.25} />
      <Sfx at={10} name="bubble" volume={0.2} />
      <Sfx at={18} name="bubble" volume={0.18} />
      <Sfx at={56} name="whoosh-low" volume={0.5} />
      {CHIPS.map((c, i) => (
        <div
          key={c.t}
          style={{
            position: "absolute",
            left: c.x + Math.sin(f * 0.35 + i * 1.7) * 9 * (1 - settle),
            top: c.y + Math.cos(f * 0.3 + i) * 9 * (1 - settle) + settle * (c.y < 960 ? -140 : 140),
            rotate: `${c.r * (1 - settle)}deg`,
            opacity: interpolate(f, [i * 4, i * 4 + 10], [0, 0.95], clamp) * (1 - settle),
            filter: `blur(${settle * 14}px)`,
            fontFamily: sans,
            fontWeight: 500,
            fontSize: 40,
            color: C.ink,
            background: "rgba(255,255,255,0.9)",
            padding: "22px 34px",
            borderRadius: 999,
            boxShadow: "0 18px 40px rgba(23,32,51,0.10)",
            whiteSpace: "nowrap",
          }}
        >
          {c.t}
        </div>
      ))}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", textAlign: "center" }}>
        <Interactive.Div
          name="Line1"
          style={{
            fontFamily: serif,
            fontWeight: 600,
            fontSize: 112,
            letterSpacing: -2,
            color: C.ink,
            lineHeight: 1.05,
            opacity: interpolate(f, [8, 26], [0, 1], { ...clamp, easing: calm }),
            translate: interpolate(f, [8, 36], ["0px 40px", "0px 0px"], { ...clamp, easing: calm }),
          }}
        >
          Tu mente
          <br />
          va a mil.
        </Interactive.Div>
        <Interactive.Div
          name="Line2"
          style={{
            fontFamily: sans,
            fontSize: 52,
            color: C.violet,
            fontWeight: 500,
            marginTop: 36,
            opacity: interpolate(f, [62, 80], [0, 1], { ...clamp, easing: calm }),
            translate: interpolate(f, [62, 90], ["0px 30px", "0px 0px"], { ...clamp, easing: calm }),
          }}
        >
          Respira. Bless se encarga.
        </Interactive.Div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
