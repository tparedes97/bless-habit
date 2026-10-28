import { Composition, Folder } from "remotion";
import { AbsoluteFill } from "remotion";
import { BlessPromo, SCENES, TOTAL, withBackdrop } from "./BlessPromo";
import { BlessPov, POV_SCENES, POV_TOTAL } from "./pov/BlessPov";
import { NightBackdrop } from "./pov/NightBackdrop";
import { BlessOrganic, ORGANIC_TOTAL } from "./organic/BlessOrganic";
import { BlessAd, adDuration, AdProps } from "./ads/BlessAd";

const W = 1080;
const H = 1920;

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="BlessPromo" component={BlessPromo} width={W} height={H} fps={30} durationInFrames={TOTAL} />
    <Folder name="BlessPromo-Scenes">
      {SCENES.map((s) => (
        <Composition
          key={s.id}
          id={s.id}
          component={withBackdrop(s.component)}
          width={W}
          height={H}
          fps={30}
          durationInFrames={s.duration}
        />
      ))}
    </Folder>
    <Composition id="BlessOrganic" component={BlessOrganic} width={W} height={H} fps={30} durationInFrames={ORGANIC_TOTAL} />
    <Folder name="Anuncios">
      {([
        ["Ad-A-Problema-28s", { hook: "problema", short: false }],
        ["Ad-B-Lista-28s", { hook: "lista", short: false }],
        ["Ad-A-Problema-15s", { hook: "problema", short: true }],
      ] as [string, AdProps][]).map(([id, p]) => (
        <Composition key={id} id={id} component={BlessAd} defaultProps={p} width={W} height={H} fps={30} durationInFrames={adDuration(p)} />
      ))}
    </Folder>
    <Composition id="BlessPov" component={BlessPov} width={W} height={H} fps={30} durationInFrames={POV_TOTAL} />
    <Folder name="BlessPov-Scenes">
      {POV_SCENES.map((s) => (
        <Composition
          key={s.id}
          id={s.id}
          component={s.night ? withNight(s.component) : withBackdrop(s.component)}
          width={W}
          height={H}
          fps={30}
          durationInFrames={s.duration}
        />
      ))}
    </Folder>
  </>
);

const withNight = (Scene: React.FC) => {
  const Wrapped: React.FC = () => (
    <AbsoluteFill>
      <NightBackdrop />
      <Scene />
    </AbsoluteFill>
  );
  return Wrapped;
};
