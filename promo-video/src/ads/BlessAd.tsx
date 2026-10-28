import { AbsoluteFill, Img, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Audio } from "@remotion/media";
import { Sfx } from "../Sfx";
import { calm, sans } from "../theme";
import { Caption } from "../organic/Caption";
import { LockWallpaper, NotifCard } from "../organic/LockScreen";
import { Screen, Tap } from "../organic/Screen";
import taps from "../../public/organic/taps.json";

/*
 * Versión para anuncios pagados (Reels/Stories, 9:16).
 * - Todo el texto vive en la zona segura de Reels: entre y=300 e y=1250, x 65..1015
 *   (Instagram tapa ~14% arriba y ~35% abajo con su interfaz).
 * - Gancho con movimiento desde el frame 0 y marca en los primeros 3 s.
 * - Cierre con llamada a la acción para Google Play (el anuncio ya trae su botón).
 */
export type AdProps = { hook: "problema" | "lista"; short: boolean };

const BAR = (60 / 84) * 4 * 30; // la música va a 84 BPM
const b = (n: number) => Math.round(n * BAR);
const T = taps as unknown as Record<string, [number, number]>;
const tapAt = (name: string, at: number): Tap => ({ at, x: T[name][0], y: T[name][1] });
const pad = (i: number) => String(i).padStart(2, "0");
const CAP_Y = 300;

const Punch: React.FC<React.PropsWithChildren> = ({ children }) => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{ scale: interpolate(f, [0, 7], [1.05, 1], { extrapolateRight: "clamp", easing: calm }) }}>{children}</AbsoluteFill>;
};

const BrandPill: React.FC<{ from: number; y: number }> = ({ from, y }) => {
  const f = useCurrentFrame();
  if (f < from) return null;
  return (
    <div style={{ position: "absolute", top: y, width: "100%", display: "flex", justifyContent: "center", scale: interpolate(f, [from, from + 6, from + 10], [0.7, 1.06, 1], { extrapolateRight: "clamp" }) }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, background: "#7C62F5", color: "white", fontFamily: sans, fontWeight: 700, fontSize: 46, padding: "14px 34px 14px 16px", borderRadius: 999, boxShadow: "0 12px 30px rgba(124,98,245,0.45)" }}>
        <Img src={staticFile("organic/icon.png")} style={{ width: 62, height: 62, borderRadius: 18, border: "3px solid rgba(255,255,255,0.7)" }} />
        Bless Habit
      </div>
    </div>
  );
};

// 1 compás: arranca con el cronómetro llegando a la meta (movimiento desde el frame 0)
const Hook: React.FC<{ hook: AdProps["hook"] }> = ({ hook }) => {
  const end = Array.from({ length: 16 }, (_, i) => ({ at: Math.round(i * 5.2), src: `timer-end-${pad(i)}` }));
  return (
    <AbsoluteFill>
      <Sfx at={42} name="note-4" volume={0.5} />
      <Screen shots={end} cams={[{ at: 0, fy: 1100, zoom: 1.35 }, { at: 86, fy: 1100, zoom: 1.45 }]} />
      {hook === "problema" ? (
        <>
          <Caption from={0} to={44} lines={["¿empiezas hábitos y", "los dejas a los 3 días? 😩"]} y={CAP_Y} size={62} />
          <Caption from={44} lines={["prueba esto 👇"]} y={CAP_Y} size={66} />
        </>
      ) : (
        <Caption from={0} lines={["5 cosas que mi app", "de hábitos ahora hace 👀"]} y={CAP_Y} size={62} />
      )}
      <BrandPill from={40} y={1165} />
    </AbsoluteFill>
  );
};

const Timer: React.FC<{ n: string }> = ({ n }) => {
  const run = Array.from({ length: 10 }, (_, i) => ({ at: 34 + i * 5, src: `timer-run-${pad(i)}` }));
  const end = Array.from({ length: 16 }, (_, i) => ({ at: 86 + Math.round(i * 2.6), src: `timer-end-${pad(i)}` }));
  return (
    <Punch>
      <Sfx at={10} name="tap" volume={0.6} />
      <Sfx at={30} name="tap" volume={0.6} />
      <Sfx at={107} name="note-4" volume={0.45} />
      <Screen
        shots={[{ at: 0, src: "cal-0" }, { at: 14, src: "timer-0" }, ...run, ...end]}
        taps={[tapAt("timer-open", 10), tapAt("timer-start", 30)]}
        cams={[{ at: 0, fy: 900, zoom: 1.05 }, { at: 16, fy: 1200, zoom: 1.12 }, { at: 86, fy: 1150, zoom: 1.12 }, { at: 110, fy: 1100, zoom: 1.3 }]}
      />
      <Caption from={0} to={86} lines={[`${n}un cronómetro`, "para cada hábito ⏱️"]} y={CAP_Y} />
      <Caption from={86} lines={["y te avisa cuando", "cumples la meta 🎉"]} y={CAP_Y} />
    </Punch>
  );
};

const Amount: React.FC<{ n: string }> = ({ n }) => (
  <Punch>
    <Sfx at={8} name="tap" volume={0.6} />
    <Sfx at={28} name="tap" volume={0.6} />
    <Sfx at={30} name="note-1" volume={0.35} />
    <Sfx at={50} name="tap" volume={0.6} />
    <Sfx at={70} name="tap" volume={0.6} />
    <Sfx at={72} name="note-3" volume={0.35} />
    <Screen
      shots={[{ at: 0, src: "cal-1" }, { at: 12, src: "water-0" }, { at: 32, src: "water-1" }, { at: 54, src: "water-2" }, { at: 74, src: "water-3" }]}
      taps={[tapAt("water-open", 8), tapAt("water-plus1", 28), tapAt("water-open2", 50), tapAt("water-plus2", 70)]}
      cams={[{ at: 0, fy: 1142, zoom: 1.12 }, { at: 14, fy: 1080, zoom: 1.12 }, { at: 74, fy: 1142, zoom: 1.25 }]}
    />
    <Caption from={0} to={78} lines={[`${n}metas por cantidad:`, "vasos, páginas… 💧"]} y={CAP_Y} />
    <Caption from={78} lines={["3 de 8 vasos ✓", "sin complicarte"]} y={CAP_Y} />
  </Punch>
);

const Postpone: React.FC<{ n: string }> = ({ n }) => (
  <Punch>
    <Sfx at={8} name="tap" volume={0.6} />
    <Sfx at={34} name="tap" volume={0.6} />
    <Sfx at={38} name="bubble" volume={0.4} />
    <Sfx at={80} name="tap" volume={0.6} />
    <Screen
      shots={[{ at: 0, src: "water-3" }, { at: 12, src: "post-0" }, { at: 38, src: "post-1" }, { at: 84, src: "post-2" }]}
      taps={[tapAt("post-open", 8), tapAt("post-15", 34), tapAt("post-ok", 80)]}
      cams={[{ at: 0, fy: 975, zoom: 1.12 }, { at: 12, fy: 1050, zoom: 1.15 }, { at: 84, fy: 975, zoom: 1.2 }]}
    />
    <Caption from={0} to={84} lines={[`${n}¿no llegas?`, "lo pospones ⏰"]} y={CAP_Y} />
    <Caption from={84} lines={["y el recordatorio", "se mueve solo ✨"]} y={CAP_Y} />
  </Punch>
);

const Alarm: React.FC<{ n: string }> = ({ n }) => {
  const f = useCurrentFrame();
  const ringing = f >= 4 && f < 50 ? 1 : 0;
  const sec = Math.max(1, Math.floor((f - 58) / 30) + 1);
  return (
    <Punch>
      <Sfx at={4} name="alarm" volume={0.55} />
      <Sfx at={54} name="tap" volume={0.6} />
      <LockWallpaper time="7:30" shake={ringing}>
        {f < 58 ? (
          <NotifCard enter={4} header="Bless Habit · ahora" title="🚶 Hora de caminar" body="Meta: 20 min" actions={["▶ Iniciar cronómetro", "Posponer 15 min"]} pressed={{ index: 0, at: 54 }} big={ringing === 1 && f % 10 < 5} />
        ) : (
          <NotifCard enter={58} header={`Bless Habit · ⏱ 00:0${Math.min(9, sec)}`} title="🚶 Caminar" body="Cronómetro en curso · meta 20 min" actions={["Pausar", "Terminar"]} />
        )}
      </LockWallpaper>
      <Caption from={0} to={62} lines={[`${n}recordatorios que`, "suenan como alarma 🔔"]} y={1060} />
      <Caption from={62} lines={["y el cronómetro sigue", "con el celu bloqueado 🔒"]} y={1060} />
    </Punch>
  );
};

const Metrics: React.FC<{ n: string }> = ({ n }) => (
  <Punch>
    <Sfx at={0} name="whoosh-soft" volume={0.35} />
    <Sfx at={44} name="whoosh-soft" volume={0.3} />
    <Screen
      shots={[{ at: 0, src: "metrics-00" }, ...Array.from({ length: 5 }, (_, i) => ({ at: 44 + i * 8, src: `metricsB-${pad(i)}` }))]}
      cams={[{ at: 0, fy: 950, zoom: 1.12 }, { at: 86, fy: 950, zoom: 1.18 }]}
    />
    <Caption from={0} to={44} lines={[`${n}y ves tu progreso`, "de verdad 📊"]} y={CAP_Y} />
    <Caption from={44} lines={[`${n}y ves tu progreso`, "de verdad 📊"]} y={1080} />
    <div style={{ position: "absolute", top: 1215, right: 80, fontFamily: sans, fontSize: 26, color: "#6B6585", background: "rgba(255,255,255,0.85)", padding: "4px 14px", borderRadius: 10 }}>
      datos de ejemplo
    </div>
  </Punch>
);

const EndCard: React.FC = () => {
  const f = useCurrentFrame();
  const pulse = 1 + Math.max(0, Math.sin((f - 40) / 6)) * 0.035 * (f > 40 ? 1 : 0);
  return (
    <Punch>
      <Sfx at={4} name="sparkle" volume={0.45} />
      <AbsoluteFill style={{ filter: "blur(18px)", scale: 1.08 }}>
        <Screen shots={[{ at: 0, src: "post-2" }]} cams={[{ at: 0, fy: 1000, zoom: 1 }]} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "rgba(246,245,251,0.6)" }} />
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 330 }}>
        <Img
          src={staticFile("organic/icon.png")}
          style={{
            width: 230,
            height: 230,
            borderRadius: 58,
            boxShadow: "0 30px 70px rgba(80,60,180,0.35)",
            scale: interpolate(f, [2, 12], [0.6, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: calm }),
            opacity: interpolate(f, [2, 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          }}
        />
      </AbsoluteFill>
      <Caption from={8} lines={["Bless Habit 🌱"]} y={610} size={72} />
      <Caption from={18} lines={["tus hábitos, sin presión"]} y={730} size={50} />
      <div
        style={{
          position: "absolute",
          top: 880,
          width: "100%",
          display: "flex",
          justifyContent: "center",
          opacity: interpolate(f, [26, 34], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          scale: interpolate(f, [26, 38], [0.85, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: calm }) * pulse,
        }}
      >
        <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 52, color: "white", background: "linear-gradient(135deg, #7C62F5, #8B6CF6)", padding: "34px 60px", borderRadius: 999, boxShadow: "0 24px 60px rgba(124,98,245,0.45)" }}>
          Descárgala gratis ▸
        </div>
      </div>
      <div style={{ position: "absolute", top: 1060, width: "100%", textAlign: "center", fontFamily: sans, fontWeight: 500, fontSize: 42, color: "#3E3A55", opacity: interpolate(f, [34, 44], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
        en Google Play · Android
      </div>
    </Punch>
  );
};

type Section = { name: string; bars: number; render: () => React.ReactNode };

const sections = ({ hook, short }: AdProps): Section[] => {
  const num = hook === "lista";
  const n = (i: number) => (num ? `${i}. ` : "");
  const all: Section[] = [
    { name: "Hook", bars: 1, render: () => <Hook hook={hook} /> },
    { name: "Timer", bars: 1.5, render: () => <Timer n={n(1)} /> },
    { name: "Amount", bars: 1.5, render: () => <Amount n={n(2)} /> },
    { name: "Postpone", bars: 1.5, render: () => <Postpone n={n(3)} /> },
    { name: "Alarm", bars: 1.5, render: () => <Alarm n={n(4)} /> },
    { name: "Metrics", bars: 1, render: () => <Metrics n={n(5)} /> },
    { name: "End", bars: 2, render: () => <EndCard /> },
  ];
  if (!short) return all;
  return [all[0], all[1], all[2], { ...all[6], bars: 1.5 }];
};

export const adDuration = (p: AdProps) => b(sections(p).reduce((s, x) => s + x.bars, 0));

export const BlessAd: React.FC<AdProps> = (props) => {
  const secs = sections(props);
  const starts = secs.map((_, i) => b(secs.slice(0, i).reduce((s, x) => s + x.bars, 0)));
  const total = adDuration(props);
  return (
    <AbsoluteFill style={{ background: "#F6F5FB" }}>
      {secs.map((s, i) => (
        <Sequence key={s.name} name={s.name} from={starts[i]} durationInFrames={(i + 1 < secs.length ? starts[i + 1] : total) - starts[i]}>
          {s.render()}
        </Sequence>
      ))}
      <Audio
        src={staticFile("music/lofi-calm.wav")}
        trimBefore={b(1)}
        volume={(f) => interpolate(f, [0, total - 30, total - 1], [0.7, 0.7, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
      />
    </AbsoluteFill>
  );
};
