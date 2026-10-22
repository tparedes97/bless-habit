import { AbsoluteFill, random, useCurrentFrame } from "remotion";

// Cielo nocturno con estrellas que titilan
export const NightBackdrop: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "linear-gradient(170deg, #0E0C1D 0%, #1C1838 60%, #2B2650 100%)", overflow: "hidden" }}>
      {new Array(60).fill(0).map((_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: random(`x${i}`) * 1080,
            top: random(`y${i}`) * 1920,
            width: 3 + random(`s${i}`) * 4,
            height: 3 + random(`s${i}`) * 4,
            borderRadius: "50%",
            background: "white",
            opacity: 0.15 + 0.45 * ((Math.sin(f / 12 + random(`p${i}`) * 10) + 1) / 2),
          }}
        />
      ))}
      <div
        style={{
          position: "absolute",
          width: 900,
          height: 900,
          left: 300,
          top: 1200,
          borderRadius: "50%",
          background: "#5B48C9",
          filter: "blur(200px)",
          opacity: 0.35,
        }}
      />
    </AbsoluteFill>
  );
};
