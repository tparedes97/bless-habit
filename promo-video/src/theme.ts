import { Easing } from "remotion";
import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

// Fraunces (títulos) y DM Sans (interfaz), incluidas en public/fonts
export const serif = "Fraunces";
export const sans = "DM Sans";

const fonts: [string, string, string][] = [
  [serif, "500", "fraunces-latin-500-normal.woff2"],
  [serif, "600", "fraunces-latin-600-normal.woff2"],
  [sans, "400", "dm-sans-latin-400-normal.woff2"],
  [sans, "500", "dm-sans-latin-500-normal.woff2"],
  [sans, "700", "dm-sans-latin-700-normal.woff2"],
];
fonts.forEach(([family, weight, file]) => {
  loadFont({ family, weight, url: staticFile(`fonts/${file}`) });
});

// Colores de marca de Bless Habit (templates/index.html)
export const C = {
  violet: "#7C62F5",
  violetSoft: "#A897FB",
  mint: "#43D6A1",
  mintSoft: "#BDF0DC",
  ink: "#172033",
  muted: "#6B6585",
  card: "#FFFFFF",
  bubble: "#F3F2F9",
  line: "#ECEAF2",
};

// Curva suave: arranca con intención y se posa despacio
export const calm = Easing.bezier(0.16, 1, 0.3, 1);

export const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;
