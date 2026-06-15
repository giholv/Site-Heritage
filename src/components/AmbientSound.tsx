import { useEffect, useRef, useState } from "react";
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
    const audio = audioRef.current;
    if (!audio) return;

    if (!audio.paused) {
      pauseAudio();
      return;
    }

    await playAudio();
  }

  function handleEnded() {
    setTrackIndex((prev) => (prev + 1) % TRACKS.length);
  }

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!playing) return;

    audio.load();

    window.setTimeout(() => {
      playAudio();
    }, 80);
  }, [trackIndex]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("calea-sound-state", {
        detail: { playing },
      })
    );
  }, [playing]);

  useEffect(() => {
    function handleToggleSound() {
      toggleSound();
    }

    window.addEventListener("calea-toggle-sound", handleToggleSound);

    return () => {
      window.removeEventListener("calea-toggle-sound", handleToggleSound);
    };
  }, []);

  return (
    <>
      <audio
        ref={audioRef}
        src={currentTrack.src}
        preload="none"
        onEnded={handleEnded}
      />

      {!hidden && (
        <button
          type="button"
          onClick={toggleSound}
          aria-label={playing ? "Desligar som ambiente" : "Ligar som ambiente"}
          title={playing ? "Desligar som ambiente" : "Ligar som ambiente"}
          className={[
            "fixed left-4 bottom-[142px] z-[9998]",
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
      )}
    </>
  );
}