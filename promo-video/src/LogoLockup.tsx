import { AbsoluteFill, Img, staticFile } from "remotion";
import { sans } from "./theme";

// Logo horizontal: ícono de la app + "Bless Habit", fondo transparente
export const LogoLockup: React.FC<{ dark: boolean }> = ({ dark }) => (
  <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 70 }}>
    <Img src={staticFile("organic/icon-1024.png")} style={{ width: 440, height: 440, borderRadius: 110 }} />
    <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 230, letterSpacing: -6, color: dark ? "#FFFFFF" : "#172033" }}>
      Bless Habit
    </div>
  </AbsoluteFill>
);
