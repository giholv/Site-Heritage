import { useRef, useState } from "react";
import { SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";

const TRACKS = [
  {
    title: "Caléa Ambiente 01",
    src: "/audio/calea-01.mp3",
  },
  {
    title: "Caléa Ambiente 02",
    src: "/audio/calea-02.mp3",
  },
  {
    title: "Caléa Ambiente 03",
    src: "/audio/calea-03.mp3",
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

  async function nextTrack() {
    const nextIndex = (trackIndex + 1) % TRACKS.length;
    setTrackIndex(nextIndex);

    setTimeout(() => {
      if (playing) playAudio();
    }, 50);
  }

  async function previousTrack() {
    const previousIndex =
      trackIndex === 0 ? TRACKS.length - 1 : trackIndex - 1;

    setTrackIndex(previousIndex);

    setTimeout(() => {
      if (playing) playAudio();
    }, 50);
  }

  async function handleEnded() {
    const nextIndex = (trackIndex + 1) % TRACKS.length;
    setTrackIndex(nextIndex);

    setTimeout(() => {
      playAudio();
    }, 50);
  }

  return (
    <div className="fixed bottom-5 left-5 z-50">
      <audio
        ref={audioRef}
        src={currentTrack.src}
        preload="none"
        onEnded={handleEnded}
      />

      <div className="rounded-[22px] border border-[#e9e2d6] bg-white/95 px-4 py-3 text-[#2b554e] shadow-sm backdrop-blur">
        <p className="max-w-[220px] truncate text-xs font-medium text-gray-500">
          {currentTrack.title}
        </p>

        <div className="mt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={previousTrack}
            className="rounded-full p-2 hover:bg-[#fcfaf6]"
            aria-label="Música anterior"
          >
            <SkipBack size={17} />
          </button>

          <button
            type="button"
            onClick={toggleSound}
            className="flex items-center gap-2 rounded-full bg-[#2b554e] px-4 py-2 text-sm font-semibold text-white hover:brightness-95"
            aria-label={playing ? "Desligar som ambiente" : "Ligar som ambiente"}
          >
            {playing ? <Volume2 size={17} /> : <VolumeX size={17} />}
            {playing ? "Som ligado" : "Som ambiente"}
          </button>

          <button
            type="button"
            onClick={nextTrack}
            className="rounded-full p-2 hover:bg-[#fcfaf6]"
            aria-label="Próxima música"
          >
            <SkipForward size={17} />
          </button>
        </div>
      </div>
    </div>
  );
}