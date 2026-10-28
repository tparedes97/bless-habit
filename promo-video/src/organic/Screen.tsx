import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { calm } from "../theme";

// Pantalla real de la app (capturas 1079x2337) a pantalla completa, como una
// grabación de pantalla: cambia de captura, marca los toques y hace zoom suave.
export type Shot = { at: number; src: string };
export type Tap = { at: number; x: number; y: number };
export type Cam = { at: number; fy: number; zoom: number };

const IMG_W = 1079;
const IMG_H = 2337;
const FOCUS_Y = 1080; // en qué altura de la pantalla queda el punto de interés

export const Screen: React.FC<{ shots: Shot[]; taps?: Tap[]; cams: Cam[] }> = ({ shots, taps = [], cams }) => {
  const f = useCurrentFrame();
  // cámara interpolada entre keyframes
  const at = cams.map((c) => c.at);
  const zoom = cams.length > 1 ? interpolate(f, at, cams.map((c) => c.zoom), { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: calm }) : cams[0].zoom;
  const fy = cams.length > 1 ? interpolate(f, at, cams.map((c) => c.fy), { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: calm }) : cams[0].fy;
  const s = (1080 / IMG_W) * zoom;
  const w = IMG_W * s;
  const h = IMG_H * s;
  const tx = (1080 - w) / 2;
  const ty = Math.min(0, Math.max(1920 - h, FOCUS_Y - fy * s));

  return (
    <AbsoluteFill style={{ background: "#F6F5FB", overflow: "hidden" }}>
      {shots.map((sh, i) => {
        const end = i + 1 < shots.length ? shots[i + 1].at : Infinity;
        // se mantiene montada un instante extra para que no parpadee al cambiar
        if (f < sh.at || f >= end + 1) return null;
        return (
          <Img
            key={sh.src + i}
            src={staticFile(`organic/${sh.src}.png`)}
            style={{ position: "absolute", left: tx, top: ty, width: w, height: h }}
          />
        );
      })}
      {taps.map((t, i) => {
        const p = interpolate(f, [t.at - 3, t.at, t.at + 10], [0, 1, 1.6], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const o = interpolate(f, [t.at - 3, t.at, t.at + 10], [0, 0.55, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        if (o <= 0) return null;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: tx + t.x * s - 55,
              top: ty + t.y * s - 55,
              width: 110,
              height: 110,
              borderRadius: "50%",
              background: "rgba(40,40,60,0.35)",
              border: "4px solid rgba(255,255,255,0.8)",
              opacity: o,
              scale: 0.6 + p * 0.4,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
