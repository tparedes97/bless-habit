import { AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { Backdrop } from "./Backdrop";
import { Hook } from "./scenes/Hook";
import { Breathe } from "./scenes/Breathe";
import { Chat } from "./scenes/Chat";
import { Agenda } from "./scenes/Agenda";
import { Growth } from "./scenes/Growth";
import { Cta } from "./scenes/Cta";

const FADE = 15;

export const SCENES = [
  { id: "Hook", component: Hook, duration: 105 },
  { id: "Breathe", component: Breathe, duration: 90 },
  { id: "Chat", component: Chat, duration: 150 },
  { id: "Agenda", component: Agenda, duration: 140 },
  { id: "Growth", component: Growth, duration: 125 },
  { id: "Cta", component: Cta, duration: 165 },
] as const;

export const TOTAL =
  SCENES.reduce((sum, s) => sum + s.duration, 0) - FADE * (SCENES.length - 1);

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

export const BlessPromo: React.FC = () => (
  <AbsoluteFill>
    <Backdrop />
    <TransitionSeries>
      <TransitionSeries.Sequence name="Hook" durationInFrames={105}>
        <Hook />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: FADE })} />
      <TransitionSeries.Sequence name="Breathe" durationInFrames={90}>
        <Breathe />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: FADE })} />
      <TransitionSeries.Sequence name="Chat" durationInFrames={150}>
        <Chat />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: FADE })} />
      <TransitionSeries.Sequence name="Agenda" durationInFrames={140}>
        <Agenda />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: FADE })} />
      <TransitionSeries.Sequence name="Growth" durationInFrames={125}>
        <Growth />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: FADE })} />
      <TransitionSeries.Sequence name="Cta" durationInFrames={165}>
        <Cta />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  </AbsoluteFill>
);
