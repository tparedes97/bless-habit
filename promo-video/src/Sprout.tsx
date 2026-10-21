import { clamp } from "./theme";
import { interpolate } from "remotion";

// El brote del logo, que crece según `progress` (0 → 1)
export const Sprout: React.FC<{ progress: number; size: number; color?: string }> = ({
  progress,
  size,
  color = "white",
}) => {
  const stem = interpolate(progress, [0, 0.5], [1, 0], clamp);
  const left = interpolate(progress, [0.35, 0.8], [0, 1], clamp);
  const right = interpolate(progress, [0.5, 1], [0, 1], clamp);
  return (
    <svg width={size} height={size} viewBox="0 0 512 512">
      <path
        d="M256 362 C 258 320 258 280 256 236"
        stroke={color}
        strokeWidth={24}
        strokeLinecap="round"
        fill="none"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={stem}
      />
      <path
        d="M252 240 C 200 246 158 218 148 170 C 202 168 242 194 252 240 Z"
        fill={color}
        style={{ scale: left, transformOrigin: "252px 240px", transformBox: "view-box" }}
      />
      <path
        d="M260 238 C 270 180 320 134 386 128 C 380 192 330 236 260 238 Z"
        fill={color}
        style={{ scale: right, transformOrigin: "260px 238px", transformBox: "view-box" }}
      />
    </svg>
  );
};

export const LogoTile: React.FC<{ progress: number; size: number }> = ({ progress, size }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: size * 0.28,
      background: "linear-gradient(135deg, #7C62F5 0%, #A897FB 100%)",
      boxShadow: "0 40px 90px rgba(124, 98, 245, 0.35)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <Sprout progress={progress} size={size} />
  </div>
);
