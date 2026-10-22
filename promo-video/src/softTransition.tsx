import type { TransitionPresentation, TransitionPresentationComponentProps } from "@remotion/transitions";
import { AbsoluteFill, interpolate } from "remotion";

type Props = {
  // "up" / "left": la escena nueva entra deslizándose; "dream": zoom suave tipo sueño
  mode: "up" | "left" | "dream";
};

// Transición calmada: desenfoque + movimiento + fundido. Funciona en cualquier navegador.
const SoftTransition: React.FC<TransitionPresentationComponentProps<Props>> = ({
  children,
  presentationDirection,
  presentationProgress: p,
  passedProps: { mode },
}) => {
  const entering = presentationDirection === "entering";
  const dist = 220;

  const style: React.CSSProperties = entering
    ? {
        opacity: interpolate(p, [0.15, 0.75], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        filter: `blur(${interpolate(p, [0, 1], [28, 0])}px)`,
        translate:
          mode === "up" ? `0px ${(1 - p) * dist}px` : mode === "left" ? `${(1 - p) * dist}px 0px` : "0px 0px",
        scale: mode === "dream" ? interpolate(p, [0, 1], [0.86, 1]) : interpolate(p, [0, 1], [0.97, 1]),
      }
    : {
        opacity: interpolate(p, [0, 0.6], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        filter: `blur(${interpolate(p, [0, 1], [0, 28])}px)`,
        translate: mode === "up" ? `0px ${-p * dist * 0.6}px` : mode === "left" ? `${-p * dist * 0.6}px 0px` : "0px 0px",
        scale: mode === "dream" ? interpolate(p, [0, 1], [1, 1.22]) : interpolate(p, [0, 1], [1, 0.97]),
        rotate: mode === "dream" ? `${p * 2}deg` : "0deg",
      };

  return <AbsoluteFill style={style}>{children}</AbsoluteFill>;
};

export const soft = (mode: Props["mode"]): TransitionPresentation<Props> => ({
  component: SoftTransition,
  props: { mode },
});
