import { lightLeak } from "@remotion/effects/light-leak";
import { interpolate, Solid, useCurrentFrame, useVideoConfig } from "remotion";

// Destello de luz violeta que cruza la pantalla en los momentos clave
export const LightLeak: React.FC<{ seed?: number; hueShift?: number }> = ({ seed = 0, hueShift = 285 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, height, width } = useVideoConfig();
  return (
    <Solid
      width={width}
      height={height}
      style={{ opacity: 0.4, mixBlendMode: "screen" }}
      effects={[
        lightLeak({
          seed,
          hueShift,
          progress: interpolate(frame, [0, durationInFrames - 1], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }),
      ]}
    />
  );
};
