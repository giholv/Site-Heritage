import { useRef, useState } from "react";
import { Music, VolumeX } from "lucide-react";

const TRACKS = [
  {
    title: "Caléa Ambiente 01",
    src: "/audio/calea-01.mp3",
  },
  {
    title: "Caléa Ambiente 02",
    src: "/audio/calea-02.mp3",
  },
];

type AmbientSoundProps = {
  hidden?: boolean;
};

export default function AmbientSound({ hidden = false }: AmbientSoundProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [playing, setPlaying] = useState(false);
  const [trackIndex, setTrackIndex] = useState(0);

  const currentTrack = TRACKS[trackIndex];
  if (hidden) return null;

  async function playAudio() {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = 0.18;

    try {
      await audio.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
    }
  }

  function pauseAudio() {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    setPlaying(false);
  }

  async function toggleSound() {
    if (playing) {
      pauseAudio();
      return;
    }

    await playAudio();
  }

  function handleEnded() {
    const nextIndex = (trackIndex + 1) % TRACKS.length;
    setTrackIndex(nextIndex);

    window.setTimeout(() => {
      playAudio();
    }, 80);
  }

  return (
    <>
      <audio
        ref={audioRef}
        src={currentTrack.src}
        preload="none"
        onEnded={handleEnded}
      />

      <button
        type="button"
        onClick={toggleSound}
        aria-label={playing ? "Desligar som ambiente" : "Ligar som ambiente"}
        title={playing ? "Desligar som ambiente" : "Ligar som ambiente"}
        className={[
          /**
           * MOBILE:
           * sobe o botão para não encostar na barra fixa de compra
           */
          "fixed left-4 bottom-[142px] z-[9998]",

          /**
           * DESKTOP:
           * volta para o canto inferior
           */
          "md:bottom-6 md:left-5",

          "flex h-11 w-11 items-center justify-center rounded-full md:h-12 md:w-12",
          "border border-[#e8dfd2]/80 bg-[#FCFAF6]/90 text-[#2b554e]",
          "backdrop-blur-xl shadow-[0_10px_28px_rgba(43,85,78,0.16)]",
          "transition hover:bg-white active:scale-95",
          playing ? "border-[#2b554e] bg-[#2b554e] text-white" : "",
        ].join(" ")}
      >
        {playing ? (
          <Music size={19} strokeWidth={1.8} />
        ) : (
          <VolumeX size={19} strokeWidth={1.8} />
        )}
      </button>
    </>
  );
}