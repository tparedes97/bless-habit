import { AbsoluteFill, Interactive, interpolate, useCurrentFrame } from "remotion";
import { Card, Headline } from "../Headline";
import { C, calm, clamp, sans } from "../theme";

const bubbleIn = (f: number, at: number) => ({
  opacity: interpolate(f, [at, at + 14], [0, 1], { ...clamp, easing: calm }),
  translate: interpolate(f, [at, at + 24], ["0px 36px", "0px 0px"], { ...clamp, easing: calm }),
});

// Le cuentas tu día a Bless y lo convierte en un recordatorio
export const Chat: React.FC = () => {
  const f = useCurrentFrame();
  const typing = interpolate(f, [48, 52, 70, 74], [0, 1, 1, 0], clamp);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <Headline title="Cuéntale tu día." sub="Bless lo convierte en un plan." />
      <Card enter={10} style={{ marginTop: 90, minHeight: 640, display: "flex", flexDirection: "column", gap: 34 }}>
        <Interactive.Div
          name="Reminder"
          style={{
            alignSelf: "center",
            fontFamily: sans,
            fontWeight: 700,
            fontSize: 38,
            color: "#167A57",
            background: "#E3F8F0",
            padding: "18px 34px",
            borderRadius: 999,
            opacity: interpolate(f, [104, 118], [0, 1], { ...clamp, easing: calm }),
            scale: interpolate(f, [104, 124], [0.85, 1], {
              ...clamp,
              easing: calm,
              output: "perceptual-scale",
            }),
          }}
        >
          ⏰ Recordatorio · mañana 6:30
        </Interactive.Div>
        <Interactive.Div
          name="UserBubble"
          style={{
            alignSelf: "flex-end",
            maxWidth: 700,
            fontFamily: sans,
            fontSize: 46,
            lineHeight: 1.3,
            color: "white",
            background: "linear-gradient(135deg, #7C62F5, #8B6CF6)",
            padding: "30px 40px",
            borderRadius: "44px 44px 12px 44px",
            boxShadow: "0 16px 36px rgba(124,98,245,0.3)",
            ...bubbleIn(f, 24),
          }}
        >
          Mañana quiero meditar temprano, a las 6:30 🧘
        </Interactive.Div>
        <div
          style={{
            alignSelf: "flex-start",
            display: "flex",
            gap: 12,
            background: C.bubble,
            padding: "30px 38px",
            borderRadius: "44px 44px 44px 12px",
            opacity: typing,
            height: typing > 0 ? undefined : 0,
            paddingTop: typing > 0 ? 30 : 0,
            paddingBottom: typing > 0 ? 30 : 0,
          }}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: 18,
                height: 18,
                borderRadius: "50%",
                background: C.muted,
                opacity: 0.35 + 0.65 * ((Math.sin(f / 3 - i) + 1) / 2),
              }}
            />
          ))}
        </div>
        <Interactive.Div
          name="BlessBubble"
          style={{
            alignSelf: "flex-start",
            maxWidth: 720,
            fontFamily: sans,
            fontSize: 46,
            lineHeight: 1.3,
            color: C.ink,
            background: C.bubble,
            padding: "30px 40px",
            borderRadius: "44px 44px 44px 12px",
            display: f >= 74 ? "block" : "none",
            ...bubbleIn(f, 74),
          }}
        >
          Listo 🌱 Te aviso a las 6:30. Un paso a la vez.
        </Interactive.Div>
      </Card>
    </AbsoluteFill>
  );
};
