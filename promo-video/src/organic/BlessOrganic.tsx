import { AbsoluteFill, Img, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Audio } from "@remotion/media";
import { Sfx } from "../Sfx";
import { calm, sans } from "../theme";
import { Caption } from "./Caption";
import { LockWallpaper, NotifCard } from "./LockScreen";
import { Screen, Tap } from "./Screen";
import taps from "../../public/organic/taps.json";

// La música va a 84 BPM: cada sección dura compases completos para que los cortes caigan a tiempo.
const BAR = (60 / 84) * 4 * 30; // 85.7 frames
const b = (n: number) => Math.round(n * BAR);
const T = taps as unknown as Record<string, [number, number]>;
const tapAt = (name: string, at: number): Tap => ({ at, x: T[name][0], y: T[name][1] });

// Pequeño "punch-in" al entrar en cada corte, como en las ediciones de CapCut
const Punch: React.FC<React.PropsWithChildren> = ({ children }) => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{ scale: interpolate(f, [0, 7], [1.05, 1], { extrapolateRight: "clamp", easing: calm }) }}>{children}</AbsoluteFill>;
};

const Hook: React.FC = () => (
  <Punch>
    <Screen shots={[{ at: 0, src: "cal-0" }]} cams={[{ at: 0, fy: 1000, zoom: 1 }, { at: 86, fy: 1000, zoom: 1 }]} />
    <Caption from={2} lines={["5 cosas que mi app", "de hábitos ahora hace 👀"]} y={560} size={66} />
  </Punch>
);

const Timer: React.FC = () => {
  const run = Array.from({ length: 10 }, (_, i) => ({ at: 50 + i * 6, src: `timer-run-${String(i).padStart(2, "0")}` }));
  const end = Array.from({ length: 16 }, (_, i) => ({ at: 110 + i * 4, src: `timer-end-${String(i).padStart(2, "0")}` }));
  return (
    <Punch>
      <Sfx at={14} name="tap" volume={0.6} />
      <Sfx at={44} name="tap" volume={0.6} />
      <Sfx at={142} name="note-4" volume={0.5} />
      <Screen
        shots={[{ at: 0, src: "cal-0" }, { at: 20, src: "timer-0" }, ...run, ...end]}
        taps={[tapAt("timer-open", 14), tapAt("timer-start", 44)]}
        cams={[
          { at: 0, fy: 900, zoom: 1 },
          { at: 22, fy: 1200, zoom: 1 },
          { at: 104, fy: 1150, zoom: 1 },
          { at: 140, fy: 1100, zoom: 1.3 },
        ]}
      />
      <Caption from={0} to={110} lines={["1. un cronómetro", "para cada hábito ⏱️"]} />
      <Caption from={110} lines={["y te avisa cuando", "cumples la meta 🎉"]} />
    </Punch>
  );
};

const LockTimer: React.FC = () => {
  const f = useCurrentFrame();
  const sec = 252 + Math.floor(f / 30);
  const clock = `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
  return (
    <Punch>
      <Sfx at={0} name="whoosh-soft" volume={0.35} />
      <LockWallpaper time="7:12">
        <NotifCard enter={4} header={`Bless Habit · ⏱ ${clock}`} title="🧘 Meditar" body="Cronómetro en curso · meta 10 min" actions={["Pausar", "Terminar"]} />
      </LockWallpaper>
      <Caption from={0} lines={["y sigue contando con", "el celu bloqueado 🔒"]} y={1300} />
    </Punch>
  );
};

const Amount: React.FC = () => (
  <Punch>
    <Sfx at={12} name="tap" volume={0.6} />
    <Sfx at={40} name="tap" volume={0.6} />
    <Sfx at={42} name="note-1" volume={0.35} />
    <Sfx at={70} name="tap" volume={0.6} />
    <Sfx at={98} name="tap" volume={0.6} />
    <Sfx at={100} name="note-3" volume={0.35} />
    <Screen
      shots={[
        { at: 0, src: "cal-1" },
        { at: 18, src: "water-0" },
        { at: 46, src: "water-1" },
        { at: 76, src: "water-2" },
        { at: 104, src: "water-3" },
      ]}
      taps={[tapAt("water-open", 12), tapAt("water-plus1", 40), tapAt("water-open2", 70), tapAt("water-plus2", 98)]}
      cams={[
        { at: 0, fy: 1142, zoom: 1 },
        { at: 20, fy: 1080, zoom: 1 },
        { at: 104, fy: 1142, zoom: 1 },
      ]}
    />
    <Caption from={0} to={110} lines={["2. metas por cantidad:", "vasos, páginas… 💧"]} />
    <Caption from={110} lines={["3 de 8 vasos ✓", "sin complicarte"]} />
  </Punch>
);

const Postpone: React.FC = () => (
  <Punch>
    <Sfx at={14} name="tap" volume={0.6} />
    <Sfx at={50} name="tap" volume={0.6} />
    <Sfx at={56} name="bubble" volume={0.4} />
    <Sfx at={104} name="tap" volume={0.6} />
    <Screen
      shots={[
        { at: 0, src: "water-3" },
        { at: 20, src: "post-0" },
        { at: 56, src: "post-1" },
        { at: 110, src: "post-2" },
      ]}
      taps={[tapAt("post-open", 14), tapAt("post-15", 50), tapAt("post-ok", 104)]}
      cams={[
        { at: 0, fy: 975, zoom: 1 },
        { at: 20, fy: 1050, zoom: 1 },
        { at: 110, fy: 975, zoom: 1 },
      ]}
    />
    <Caption from={0} to={110} lines={["3. ¿no llegas?", "lo pospones ⏰"]} />
    <Caption from={110} lines={["y el recordatorio", "se mueve solo ✨"]} />
  </Punch>
);

const Alarm: React.FC = () => {
  const f = useCurrentFrame();
  const ringing = f >= 6 && f < 58 ? 1 : 0;
  return (
    <Punch>
      <Sfx at={6} name="alarm" volume={0.55} />
      <Sfx at={60} name="tap" volume={0.6} />
      <LockWallpaper time="7:30" shake={ringing}>
        {f < 64 ? (
          <NotifCard enter={6} header="Bless Habit · ahora" title="🚶 Hora de caminar" body="Meta: 20 min" actions={["▶ Iniciar cronómetro", "Posponer 15 min"]} pressed={{ index: 0, at: 60 }} big={ringing === 1 && f % 10 < 5} />
        ) : (
          <NotifCard enter={64} header="Bless Habit · ⏱ 00:01" title="🚶 Caminar" body="Cronómetro en curso · meta 20 min" actions={["Pausar", "Terminar"]} />
        )}
      </LockWallpaper>
      <Caption from={0} lines={["4. recordatorios que", "suenan como alarma 🔔"]} y={1300} />
    </Punch>
  );
};

const Metrics: React.FC = () => (
  <Punch>
    <Sfx at={0} name="whoosh-soft" volume={0.35} />
    <Sfx at={44} name="whoosh-soft" volume={0.3} />
    <Screen
      shots={[
        { at: 0, src: "metrics-00" },
        ...Array.from({ length: 5 }, (_, i) => ({ at: 44 + i * 8, src: `metricsB-${String(i).padStart(2, "0")}` })),
      ]}
      cams={[{ at: 0, fy: 950, zoom: 1 }, { at: 86, fy: 950, zoom: 1 }]}
    />
    <Caption from={0} to={44} lines={["5. y ves tu progreso", "de verdad 📊"]} />
    <Caption from={44} lines={["5. y ves tu progreso", "de verdad 📊"]} y={1640} />
  </Punch>
);

const Outro: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Punch>
      <Sfx at={8} name="sparkle" volume={0.45} />
      <AbsoluteFill style={{ filter: "blur(18px)", scale: 1.08 }}>
        <Screen shots={[{ at: 0, src: "post-2" }]} cams={[{ at: 0, fy: 1000, zoom: 1 }]} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "rgba(246,245,251,0.55)" }} />
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 520 }}>
        <Img
          src={staticFile("organic/icon.png")}
          style={{
            width: 260,
            height: 260,
            borderRadius: 64,
            boxShadow: "0 30px 70px rgba(80,60,180,0.35)",
            scale: interpolate(f, [4, 14], [0.6, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: calm }),
            opacity: interpolate(f, [4, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          }}
        />
      </AbsoluteFill>
      <Caption from={10} lines={["se llama Bless Habit 🌱"]} y={880} size={66} />
      <Caption from={40} lines={["gratis en Play Store", "link en mi bio 🫶"]} y={1060} />
      <div style={{ position: "absolute", bottom: 160, width: "100%", textAlign: "center", fontFamily: sans, fontSize: 36, color: "#6B6585", opacity: interpolate(f, [70, 85], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
        pantallas reales de la app ✨
      </div>
    </Punch>
  );
};

export const ORGANIC_SECTIONS = [
  { name: "Hook", c: Hook, bars: 1 },
  { name: "Timer", c: Timer, bars: 2 },
  { name: "LockTimer", c: LockTimer, bars: 1 },
  { name: "Amount", c: Amount, bars: 2 },
  { name: "Postpone", c: Postpone, bars: 2 },
  { name: "Alarm", c: Alarm, bars: 1 },
  { name: "Metrics", c: Metrics, bars: 1 },
  { name: "Outro", c: Outro, bars: 2 },
];
const STARTS = ORGANIC_SECTIONS.map((_, i) => b(ORGANIC_SECTIONS.slice(0, i).reduce((s, x) => s + x.bars, 0)));
const TOTAL_BARS = ORGANIC_SECTIONS.reduce((s, x) => s + x.bars, 0);
const TAIL = 36; // la música termina de sonar
export const ORGANIC_TOTAL = b(TOTAL_BARS) + TAIL;

export const BlessOrganic: React.FC = () => (
  <AbsoluteFill style={{ background: "#F6F5FB" }}>
    {ORGANIC_SECTIONS.map((s, i) => {
      const C = s.c;
      const dur = i === ORGANIC_SECTIONS.length - 1 ? ORGANIC_TOTAL - STARTS[i] : STARTS[i + 1] - STARTS[i];
      return (
        <Sequence key={s.name} name={s.name} from={STARTS[i]} durationInFrames={dur}>
          <C />
        </Sequence>
      );
    })}
    <Audio
      src={staticFile("music/lofi-calm.wav")}
      volume={(f) => interpolate(f, [0, ORGANIC_TOTAL - 25, ORGANIC_TOTAL - 1], [0.7, 0.7, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
    />
  </AbsoluteFill>
);
