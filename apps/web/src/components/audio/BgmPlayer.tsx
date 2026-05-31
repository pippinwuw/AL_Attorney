import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { BGM, type BgmTrack } from '@/config/media';

function trackForPath(pathname: string): BgmTrack {
  if (pathname === '/trial') return BGM.trial;
  if (pathname === '/investigation') return BGM.investigation;
  return BGM.title;
}

export function BgmPlayer() {
  const { pathname } = useLocation();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const unlockedRef = useRef(false);

  useEffect(() => {
    const track = trackForPath(pathname);
    const audio = new Audio(track);
    audio.loop = true;
    audio.volume = 0.45;
    audioRef.current = audio;

    const tryPlay = () => {
      void audio.play().then(() => {
        unlockedRef.current = true;
      }).catch(() => {});
    };

    tryPlay();

    const unlock = () => {
      if (unlockedRef.current) return;
      tryPlay();
    };
    document.addEventListener('click', unlock, { once: true });
    document.addEventListener('keydown', unlock, { once: true });

    return () => {
      document.removeEventListener('click', unlock);
      document.removeEventListener('keydown', unlock);
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
  }, [pathname]);

  return null;
}
