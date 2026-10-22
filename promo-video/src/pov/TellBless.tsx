import { AbsoluteFill, Interactive, interpolate, useCurrentFrame } from "remotion";
import { Card } from "../Headline";
import { Sfx } from "../Sfx";
import { C, calm, clamp, sans, serif } from "../theme";

const bubbleIn = (f: number, at: number) => ({
  opacity: interpolate(f, [at, at + 14], [0, 1], { ...clamp, easing: calm }),
  translate: interpolate(f, [at, at + 24], ["0px 36px", "0px 0px"], { ...clamp, easing: calm }),
  display: f >= at ? "block" : "none",
});

const bubble: React.CSSProperties = {
  fontFamily: sans,
  fontSize: 44,
  lineHeight: 1.3,
  padding: "28px 38px",
  maxWidth: 720,
};

// Escena 3: se lo cuentas a Bless y te ordena el mañana
export const TellBless: React.FC = () => {
  const f = useCurrentFrame();
  const typing = interpolate(f, [42, 46, 64, 68], [0, 1, 1, 0], clamp);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <Sfx at={18} name="bubble" volume={0.5} />
      <Sfx at={68} name="bubble" volume={0.45} />
      <Sfx at={100} name="bubble" volume={0.45} />
      <Sfx at={132} name="chime" volume={0.4} />
      <Interactive.Div
        name="Title"
        style={{
          fontFamily: serif,
          fontWeight: 600,
          fontSize: 88,
          lineHeight: 1.08,
          letterSpacing: -1.5,
          color: C.ink,
          textAlign: "center",
          padding: "0 90px",
          opacity: interpolate(f, [10, 28], [0, 1], { ...clamp, easing: calm }),
          translate: interpolate(f, [10, 38], ["0px 30px", "0px 0px"], { ...clamp, easing: calm }),
        }}
      >
        Entonces se lo cuentas a Bless 🌱
      </Interactive.Div>
      <Card enter={6} style={{ marginTop: 70, minHeight: 780, display: "flex", flexDirection: "column", gap: 28 }}>
        <Interactive.Div
          name="UserBubble"
          style={{
            ...bubble,
            alignSelf: "flex-end",
            color: "white",
            background: "linear-gradient(135deg, #7C62F5, #8B6CF6)",
            borderRadius: "44px 44px 12px 44px",
            boxShadow: "0 16px 36px rgba(124,98,245,0.3)",
            ...bubbleIn(f, 18),
          }}
        >
          No puedo dormir. Siento que hoy no hice nada 😔
        </Interactive.Div>
        <div
          style={{
            alignSelf: "flex-start",
            display: typing > 0 ? "flex" : "none",
            gap: 12,
            background: C.bubble,
            padding: "30px 38px",
            borderRadius: "44px 44px 44px 12px",
            opacity: typing,
          }}
        >
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ width: 18, height: 18, borderRadius: "50%", background: C.muted, opacity: 0.35 + 0.65 * ((Math.sin(f / 3 - i) + 1) / 2) }} />
          ))}
        </div>
        <Interactive.Div
          name="BlessBubble1"
          style={{ ...bubble, alignSelf: "flex-start", color: C.ink, background: C.bubble, borderRadius: "44px 44px 44px 12px", ...bubbleIn(f, 68) }}
        >
          Hiciste más de lo que crees 🤍 Hoy meditaste y tomaste agua.
        </Interactive.Div>
        <Interactive.Div
          name="BlessBubble2"
          style={{ ...bubble, alignSelf: "flex-start", color: C.ink, background: C.bubble, borderRadius: "44px 44px 44px 12px", ...bubbleIn(f, 100) }}
        >
          Mañana: 🚶 caminar 7:00 y 📚 leer 21:00. Yo te aviso. Ahora descansa 🌙
        </Interactive.Div>
        <Interactive.Div
          name="Saved"
          style={{
            alignSelf: "center",
            fontFamily: sans,
            fontWeight: 700,
            fontSize: 36,
            color: "#167A57",
            background: "#E3F8F0",
            padding: "18px 34px",
            borderRadius: 999,
            opacity: interpolate(f, [132, 146], [0, 1], { ...clamp, easing: calm }),
            scale: interpolate(f, [132, 152], [0.85, 1], { ...clamp, easing: calm, output: "perceptual-scale" }),
          }}
        >
          ⏰ 2 recordatorios guardados
        </Interactive.Div>
      </Card>
    </AbsoluteFill>
  );
};
