import { Audio } from "@remotion/media";
import { Sequence, staticFile } from "remotion";

// Efecto de sonido que suena en el frame `at` (relativo a la escena)
export const Sfx: React.FC<{ at: number; name: string; volume?: number }> = ({ at, name, volume = 0.6 }) => (
  <Sequence from={at} layout="none" name={`sfx: ${name}`}>
    <Audio src={staticFile(`sfx/${name}.wav`)} volume={volume} />
  </Sequence>
);
