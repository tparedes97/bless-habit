import { AbsoluteFill, Interactive, interpolate, useCurrentFrame } from "remotion";
import { Headline } from "../Headline";
import { Sfx } from "../Sfx";
import { C, calm, clamp, sans } from "../theme";

// Los 3 estilos del editor de widgets: claro, violeta y oscuro
const STYLES = [
  { bg: "rgba(255,255,255,0.96)", text: "#1F1C4B", dim: "rgba(31,28,75,0.6)", track: "#ECEAF6", fill: C.mint },
  { bg: "linear-gradient(135deg, #7C62F5, #A897FB)", text: "#FFFFFF", dim: "rgba(255,255,255,0.8)", track: "rgba(255,255,255,0.3)", fill: "#FFFFFF" },
  { bg: "linear-gradient(135deg, #1F1C33, #2B2650)", text: "#FFFFFF", dim: "rgba(255,255,255,0.65)", track: "rgba(255,255,255,0.15)", fill: C.mint },
];
const STYLE_AT = [0, 92, 116];

const ICON_COLORS = ["#FFD6A5", "#CDE7FF", "#FFC6D9", "#D4F5E1", "#E5DDFF", "#FFF1B8", "#C9F0F0", "#FFDCCB"];

const pop = (f: number, at: number) => ({
  opacity: interpolate(f, [at, at + 12], [0, 1], { ...clamp, easing: calm }),
  scale: interpolate(f, [at, at + 22], [0.8, 1], { ...clamp, easing: calm, output: "perceptual-scale" as const }),
});

// El widget de Bless en la pantalla de inicio del celular
export const Widget: React.FC = () => {
  const f = useCurrentFrame();
  const styleIdx = STYLE_AT.filter((t) => f >= t).length - 1;
  const s = STYLES[styleIdx];
  const bump = Math.max(...STYLE_AT.slice(1).map((t) => interpolate(f, [t, t + 6, t + 16], [0, 1, 0], clamp)));
  const progress = interpolate(f, [62, 78], [2 / 4, 3 / 4], { ...clamp, easing: calm });
  const done = f >= 66 ? 3 : 2;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <Sfx at={30} name="bubble" volume={0.4} />
      <Sfx at={44} name="bubble" volume={0.35} />
      <Sfx at={64} name="note-3" volume={0.45} />
      <Sfx at={92} name="note-2" volume={0.35} />
      <Sfx at={116} name="note-4" volume={0.35} />
      <Headline title="Siempre a la vista." sub="Tu día en la pantalla de inicio." />
      <Interactive.Div
        name="Phone"
        style={{
          marginTop: 70,
          width: 740,
          height: 1180,
          borderRadius: 96,
          padding: 18,
          background: "#1B1830",
          boxShadow: "0 50px 120px rgba(40, 30, 100, 0.35)",
          boxSizing: "border-box",
          opacity: interpolate(f, [4, 20], [0, 1], { ...clamp, easing: calm }),
          translate: interpolate(f, [4, 40], ["0px 160px", "0px 0px"], { ...clamp, easing: calm }),
        }}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            borderRadius: 80,
            overflow: "hidden",
            background: "linear-gradient(165deg, #B9A8FF 0%, #D8CCFF 40%, #BDEFD9 100%)",
            padding: "70px 44px 0",
            boxSizing: "border-box",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: sans, fontWeight: 700, fontSize: 30, color: "#1F1C4B", padding: "0 20px" }}>
            <span>9:41</span>
            <span>●●● ▮</span>
          </div>
          {/* Widget resumen */}
          <Interactive.Div
            name="SummaryWidget"
            style={{
              marginTop: 44,
              borderRadius: 52,
              padding: "38px 40px",
              background: s.bg,
              boxShadow: "0 20px 50px rgba(31,28,75,0.18)",
              ...pop(f, 28),
              scale: (pop(f, 28).scale as number) * (1 + bump * 0.04),
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 38, color: s.text }}>Mi pequeño progreso ✨</div>
              <div style={{ fontFamily: sans, fontSize: 30, color: s.dim }}>Hoy</div>
            </div>
            <div style={{ height: 22, borderRadius: 11, background: s.track, marginTop: 30, overflow: "hidden" }}>
              <div style={{ width: `${progress * 100}%`, height: "100%", borderRadius: 11, background: s.fill }} />
            </div>
            <div style={{ fontFamily: sans, fontSize: 30, color: s.dim, marginTop: 16 }}>{done} de 4 completados</div>
            <div style={{ fontFamily: sans, fontWeight: 500, fontSize: 34, color: s.text, marginTop: 22 }}>
              Próximo: 📚 Leer · 21:00
            </div>
          </Interactive.Div>
          <div style={{ display: "flex", gap: 36, marginTop: 36 }}>
            {/* Widget de un hábito */}
            <Interactive.Div
              name="SingleWidget"
              style={{
                width: 300,
                height: 300,
                borderRadius: 52,
                padding: 34,
                boxSizing: "border-box",
                background: s.bg,
                boxShadow: "0 20px 50px rgba(31,28,75,0.18)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                ...pop(f, 42),
                scale: (pop(f, 42).scale as number) * (1 + bump * 0.04),
              }}
            >
              <div style={{ fontSize: 76 }}>🧘</div>
              <div>
                <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 38, color: s.text }}>Meditar</div>
                <div style={{ fontFamily: sans, fontWeight: 500, fontSize: 28, color: styleIdx === 1 ? "#FFFFFF" : C.mint }}>
                  Hecho hoy ✓
                </div>
              </div>
            </Interactive.Div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 36, alignContent: "space-between" }}>
              {ICON_COLORS.slice(0, 4).map((c, i) => (
                <div
                  key={i}
                  style={{
                    width: 132,
                    height: 132,
                    borderRadius: 38,
                    background: c,
                    boxShadow: "0 10px 24px rgba(31,28,75,0.12)",
                    opacity: interpolate(f, [18 + i * 3, 30 + i * 3], [0, 1], clamp),
                  }}
                />
              ))}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 36, marginTop: 40 }}>
            {ICON_COLORS.slice(4).map((c, i) => (
              <div
                key={i}
                style={{
                  width: 132,
                  height: 132,
                  borderRadius: 38,
                  background: c,
                  boxShadow: "0 10px 24px rgba(31,28,75,0.12)",
                  opacity: interpolate(f, [22 + i * 3, 34 + i * 3], [0, 1], clamp),
                }}
              />
            ))}
          </div>
          <Interactive.Div
            name="StyleChip"
            style={{
              position: "absolute",
              bottom: 70,
              left: 0,
              right: 0,
              margin: "0 auto",
              width: "fit-content",
              fontFamily: sans,
              fontWeight: 700,
              fontSize: 36,
              color: C.ink,
              background: "rgba(255,255,255,0.92)",
              padding: "20px 38px",
              borderRadius: 999,
              boxShadow: "0 14px 34px rgba(31,28,75,0.15)",
              ...pop(f, 86),
            }}
          >
            🎨 Elige tu estilo
          </Interactive.Div>
        </div>
      </Interactive.Div>
    </AbsoluteFill>
  );
};
