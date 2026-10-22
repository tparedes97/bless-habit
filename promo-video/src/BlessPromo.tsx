import { AbsoluteFill, interpolate, Sequence, staticFile } from "remotion";
import { Audio } from "@remotion/media";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { soft } from "./softTransition";
import { Backdrop } from "./Backdrop";
import { LightLeak } from "./LightLeak";
import { Sfx } from "./Sfx";
import { calm } from "./theme";
import { Hook } from "./scenes/Hook";
import { Breathe } from "./scenes/Breathe";
import { Chat } from "./scenes/Chat";
import { Agenda } from "./scenes/Agenda";
import { Widget } from "./scenes/Widget";
import { Growth } from "./scenes/Growth";
import { Cta } from "./scenes/Cta";

export const SCENES = [
  { id: "Hook", component: Hook, duration: 105 },
  { id: "Breathe", component: Breathe, duration: 90 },
  { id: "Chat", component: Chat, duration: 150 },
  { id: "Agenda", component: Agenda, duration: 140 },
  { id: "Widget", component: Widget, duration: 150 },
  { id: "Growth", component: Growth, duration: 125 },
  { id: "Cta", component: Cta, duration: 165 },
] as const;

// Duración de cada transición (entre la escena i y la i+1)
const T = [26, 22, 22, 24, 22, 28];

// Frame en el que arranca cada escena dentro del video completo
const STARTS = SCENES.map((_, i) =>
  SCENES.slice(0, i).reduce((sum, s) => sum + s.duration, 0) - T.slice(0, i).reduce((a, b) => a + b, 0),
);

export const TOTAL = STARTS[SCENES.length - 1] + SCENES[SCENES.length - 1].duration;

// Cada escena por separado, con el mismo fondo, para editarla en el Studio
export const withBackdrop = (Scene: React.FC) => {
  const Wrapped: React.FC = () => (
    <AbsoluteFill>
      <Backdrop />
      <Scene />
    </AbsoluteFill>
  );
  return Wrapped;
};

const timing = (i: number) => linearTiming({ durationInFrames: T[i], easing: calm });

export const BlessPromo: React.FC = () => (
  <AbsoluteFill>
    <Backdrop />
    <TransitionSeries>
      <TransitionSeries.Sequence name="Hook" durationInFrames={105}>
        <Hook />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={soft("dream")} timing={timing(0)} />
      <TransitionSeries.Sequence name="Breathe" durationInFrames={90}>
        <Breathe />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={soft("up")} timing={timing(1)} />
      <TransitionSeries.Sequence name="Chat" durationInFrames={150}>
        <Chat />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={soft("left")} timing={timing(2)} />
      <TransitionSeries.Sequence name="Agenda" durationInFrames={140}>
        <Agenda />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={soft("left")} timing={timing(3)} />
      <TransitionSeries.Sequence name="Widget" durationInFrames={150}>
        <Widget />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={soft("up")} timing={timing(4)} />
      <TransitionSeries.Sequence name="Growth" durationInFrames={125}>
        <Growth />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={soft("dream")} timing={timing(5)} />
      <TransitionSeries.Sequence name="Cta" durationInFrames={165}>
        <Cta />
      </TransitionSeries.Sequence>
    </TransitionSeries>

    {/* Destellos de luz en la aparición del logo y en el cierre */}
    <Sequence from={STARTS[1] - 10} durationInFrames={50} name="Light leak · logo">
      <LightLeak seed={3} />
    </Sequence>
    <Sequence from={STARTS[6] - 12} durationInFrames={56} name="Light leak · cierre">
      <LightLeak seed={7} hueShift={140} />
    </Sequence>

    {/* Whoosh en cada transición, centrado en el cruce */}
    <Sfx at={STARTS[1] - 6} name="whoosh-airy" volume={0.85} />
    <Sfx at={STARTS[2] - 6} name="whoosh-soft" volume={0.8} />
    <Sfx at={STARTS[3] - 6} name="whoosh-soft" volume={0.8} />
    <Sfx at={STARTS[4] - 6} name="whoosh-airy" volume={0.85} />
    <Sfx at={STARTS[5] - 6} name="whoosh-soft" volume={0.8} />
    <Sfx at={STARTS[6] - 8} name="whoosh-low" volume={0.9} />

    {/* Fondo ambiental suave en todo el video */}
    <Audio
      src={staticFile("sfx/ambient-pad.wav")}
      volume={(f) => interpolate(f, [0, 30, TOTAL - 30, TOTAL - 1], [0, 0.45, 0.45, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
    />
  </AbsoluteFill>
);
