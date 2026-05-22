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

export default function AmbientSound() {
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
    if (playing) {
      pauseAudio();
      return;
    }

    await playAudio();
  }

  async function handleEnded() {
    const nextIndex = (trackIndex + 1) % TRACKS.length;
    setTrackIndex(nextIndex);

    setTimeout(() => {
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
          "fixed bottom-6 left-5 z-[9998]",
          "flex h-12 w-12 items-center justify-center rounded-full",
          "border border-white/50 bg-white/45 text-[#2b554e]",
          "backdrop-blur-xl shadow-[0_10px_30px_rgba(43,85,78,0.16)]",
          "transition hover:bg-white/65 active:scale-95",
          playing ? "bg-[#2b554e]/90 text-white" : "",
        ].join(" ")}
      >
        {playing ? (
          <Music size={20} strokeWidth={1.8} />
        ) : (
          <VolumeX size={20} strokeWidth={1.8} />
        )}
      </button>
    </>
  );
}