import { useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

export default function AmbientSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  async function toggleSound() {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = 0.18;

    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }

    try {
      await audio.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
    }
  }

  return (
    <div className="fixed bottom-5 left-5 z-50">
      <audio ref={audioRef} src="/audio/ambiente.mp3" loop preload="none" />

      <button
        type="button"
        onClick={toggleSound}
        className="flex items-center gap-2 rounded-full border border-[#e9e2d6] bg-white/90 px-4 py-3 text-sm font-semibold text-[#2b554e] shadow-sm backdrop-blur transition hover:bg-[#fcfaf6]"
        aria-label={playing ? "Desligar som ambiente" : "Ligar som ambiente"}
      >
        {playing ? <Volume2 size={18} /> : <VolumeX size={18} />}
        {playing ? "Som ligado" : "Som ambiente"}
      </button>
    </div>
  );
}