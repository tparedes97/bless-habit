import { AbsoluteFill, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Audio } from "@remotion/media";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { Backdrop } from "../Backdrop";
import { LightLeak } from "../LightLeak";
import { Sfx } from "../Sfx";
import { soft } from "../softTransition";
import { calm } from "../theme";
import { NightBackdrop } from "./NightBackdrop";
import { Night } from "./Night";
import { Thoughts } from "./Thoughts";
import { TellBless } from "./TellBless";
import { Morning } from "./Morning";
import { PovCta } from "./PovCta";

export const POV_SCENES = [
  { id: "Pov-Night", component: Night, duration: 120, night: true },
  { id: "Pov-Thoughts", component: Thoughts, duration: 150, night: true },
  { id: "Pov-TellBless", component: TellBless, duration: 170, night: false },
  { id: "Pov-Morning", component: Morning, duration: 120, night: false },
  { id: "Pov-Cta", component: PovCta, duration: 150, night: false },
] as const;

const T = [20, 26, 22, 24];
const STARTS = POV_SCENES.map(
  (_, i) => POV_SCENES.slice(0, i).reduce((s, x) => s + x.duration, 0) - T.slice(0, i).reduce((a, b) => a + b, 0),
);
export const POV_TOTAL = STARTS[STARTS.length - 1] + POV_SCENES[POV_SCENES.length - 1].duration;

const timing = (i: number) => linearTiming({ durationInFrames: T[i], easing: calm });

// El cielo pasa de noche a día cuando entra Bless
const Sky: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Backdrop />
      <AbsoluteFill style={{ opacity: interpolate(f, [STARTS[2] - 26, STARTS[2] + 2], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
        <NightBackdrop />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const BlessPov: React.FC = () => (
  <AbsoluteFill>
    <Sky />
    <TransitionSeries>
      <TransitionSeries.Sequence name="Night" durationInFrames={120}>
        <Night />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={soft("up")} timing={timing(0)} />
      <TransitionSeries.Sequence name="Thoughts" durationInFrames={150}>
        <Thoughts />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={soft("dream")} timing={timing(1)} />
      <TransitionSeries.Sequence name="TellBless" durationInFrames={170}>
        <TellBless />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={soft("up")} timing={timing(2)} />
      <TransitionSeries.Sequence name="Morning" durationInFrames={120}>
        <Morning />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={soft("dream")} timing={timing(3)} />
      <TransitionSeries.Sequence name="Cta" durationInFrames={150}>
        <PovCta />
      </TransitionSeries.Sequence>
    </TransitionSeries>

    <Sequence from={STARTS[4] - 12} durationInFrames={56} name="Light leak · cierre">
      <LightLeak seed={7} hueShift={140} />
    </Sequence>

    <Sfx at={STARTS[1] - 6} name="whoosh-low" volume={0.7} />
    <Sfx at={STARTS[2] - 8} name="whoosh-airy" volume={0.85} />
    <Sfx at={STARTS[3] - 6} name="whoosh-soft" volume={0.8} />
    <Sfx at={STARTS[4] - 8} name="whoosh-airy" volume={0.85} />

    {/* La música calmada entra cuando aparece Bless */}
    <Sequence from={STARTS[2] - 10} name="Música de fondo">
      <Audio
        src={staticFile("sfx/ambient-pad.wav")}
        volume={(f) =>
          interpolate(f, [0, 30, POV_TOTAL - STARTS[2] - 20, POV_TOTAL - STARTS[2] + 9], [0, 1, 1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })
        }
      />
    </Sequence>
  </AbsoluteFill>
);
