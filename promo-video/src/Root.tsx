import { Composition, Folder } from "remotion";
import { BlessPromo, SCENES, TOTAL, withBackdrop } from "./BlessPromo";

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
  </>
);
