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
    <div className="fixed bottom-24 left-4 z-40 lg:bottom-6 lg:left-6">
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
          "flex h-14 w-14 items-center justify-center rounded-full",
          "border border-white/40 shadow-[0_12px_30px_rgba(43,85,78,0.22)]",
          "backdrop-blur-md transition active:scale-95",
          playing
            ? "bg-[#2b554e] text-white"
            : "bg-white/92 text-[#2b554e]",
        ].join(" ")}
      >
        {playing ? <Music size={24} /> : <VolumeX size={23} />}
      </button>
    </div>
  );
}