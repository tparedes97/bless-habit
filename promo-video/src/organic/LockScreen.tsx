import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { calm, sans } from "../theme";

// Pantalla de bloqueo de Android (recreada): fondo, reloj y notificaciones.
export const LockWallpaper: React.FC<React.PropsWithChildren<{ time: string; shake?: number }>> = ({ time, shake = 0, children }: React.PropsWithChildren<{ time: string; shake?: number }>) => {
  const f = useCurrentFrame();
  const jx = shake ? Math.sin(f * 2.3) * 7 * shake : 0;
  return (
    <AbsoluteFill style={{ background: "linear-gradient(170deg, #3B2F7A 0%, #6B55C9 45%, #9C8BEA 75%, #CFE9DF 100%)", translate: `${jx}px 0px`, overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 70, left: 60, right: 60, display: "flex", justifyContent: "space-between", fontFamily: sans, fontWeight: 500, fontSize: 34, color: "rgba(255,255,255,0.9)" }}>
        <span>{time}</span>
        <span>▾ ◢ 87%</span>
      </div>
      <div style={{ position: "absolute", top: 230, width: "100%", textAlign: "center", fontFamily: sans, fontWeight: 400, fontSize: 210, letterSpacing: -6, color: "white" }}>
        {time}
      </div>
      <div style={{ position: "absolute", top: 470, width: "100%", textAlign: "center", fontFamily: sans, fontSize: 42, color: "rgba(255,255,255,0.85)" }}>
        martes, 28 de octubre
      </div>
      {children}
      <div style={{ position: "absolute", bottom: 90, width: "100%", textAlign: "center", fontFamily: sans, fontSize: 34, color: "rgba(255,255,255,0.7)" }}>
        🔒
      </div>
    </AbsoluteFill>
  );
};

export const NotifCard: React.FC<{
  header: string;
  title: string;
  body?: string;
  actions: string[];
  enter: number;
  pressed?: { index: number; at: number };
  big?: boolean;
}> = ({ header, title, body, actions, enter, pressed, big }) => {
  const f = useCurrentFrame();
  return (
    <div
      style={{
        position: "absolute",
        top: 640,
        left: 50,
        right: 50,
        background: "rgba(255,255,255,0.94)",
        borderRadius: 48,
        padding: "34px 40px 26px",
        boxShadow: "0 30px 70px rgba(20,10,60,0.35)",
        opacity: interpolate(f, [enter, enter + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        translate: interpolate(f, [enter, enter + 16], ["0px -120px", "0px 0px"], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: calm }),
        scale: big ? 1.02 : 1,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 18, fontFamily: sans, fontSize: 32, color: "#5B5670" }}>
        <Img src={staticFile("organic/icon.png")} style={{ width: 52, height: 52, borderRadius: 14 }} />
        <span>{header}</span>
      </div>
      <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 52, color: "#15122B", marginTop: 20 }}>{title}</div>
      {body ? <div style={{ fontFamily: sans, fontSize: 42, color: "#3E3A55", marginTop: 8 }}>{body}</div> : null}
      <div style={{ display: "flex", gap: 20, marginTop: 30 }}>
        {actions.map((a, i) => {
          const isPressed = pressed && pressed.index === i && f >= pressed.at && f < pressed.at + 8;
          return (
            <div
              key={a}
              style={{
                fontFamily: sans,
                fontWeight: 700,
                fontSize: 38,
                color: "#5B3FE0",
                background: isPressed ? "#DCD4FF" : "#EFEBFF",
                padding: "20px 30px",
                borderRadius: 999,
              }}
            >
              {a}
            </div>
          );
        })}
      </div>
    </div>
  );
};
