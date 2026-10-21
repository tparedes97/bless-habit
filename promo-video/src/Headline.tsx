import { Interactive, interpolate, useCurrentFrame } from "remotion";
import { C, calm, clamp, sans, serif } from "./theme";

// Título + subtítulo que entran suavemente desde abajo
export const Headline: React.FC<{ title: string; sub?: string; delay?: number }> = ({
  title,
  sub,
  delay = 0,
}) => {
  const f = useCurrentFrame();
  return (
    <div style={{ textAlign: "center", padding: "0 90px" }}>
      <Interactive.Div
        name="Title"
        style={{
          fontFamily: serif,
          fontWeight: 600,
          fontSize: 104,
          lineHeight: 1.05,
          letterSpacing: -2,
          color: C.ink,
          opacity: interpolate(f, [delay, delay + 20], [0, 1], { ...clamp, easing: calm }),
          translate: interpolate(f, [delay, delay + 30], ["0px 40px", "0px 0px"], {
            ...clamp,
            easing: calm,
          }),
        }}
      >
        {title}
      </Interactive.Div>
      {sub ? (
        <Interactive.Div
          name="Subtitle"
          style={{
            fontFamily: sans,
            fontSize: 46,
            color: C.muted,
            marginTop: 24,
            opacity: interpolate(f, [delay + 10, delay + 30], [0, 1], { ...clamp, easing: calm }),
            translate: interpolate(f, [delay + 10, delay + 40], ["0px 30px", "0px 0px"], {
              ...clamp,
              easing: calm,
            }),
          }}
        >
          {sub}
        </Interactive.Div>
      ) : null}
    </div>
  );
};

export const Card: React.FC<{ children: React.ReactNode; enter: number; style?: React.CSSProperties }> = ({
  children,
  enter,
  style,
}) => {
  const f = useCurrentFrame();
  return (
    <Interactive.Div
      name="Card"
      style={{
        width: 920,
        background: C.card,
        borderRadius: 56,
        boxShadow: "0 40px 100px rgba(76, 60, 160, 0.14)",
        padding: 48,
        boxSizing: "border-box",
        opacity: interpolate(f, [enter, enter + 20], [0, 1], { ...clamp, easing: calm }),
        translate: interpolate(f, [enter, enter + 35], ["0px 80px", "0px 0px"], {
          ...clamp,
          easing: calm,
        }),
        ...style,
      }}
    >
      {children}
    </Interactive.Div>
  );
};
