"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { gainToVolume } from "./clips";

type YouTubeWindow = Window & {
  YT?: typeof YT;
  onYouTubeIframeAPIReady?: () => void;
};

let apiPromise: Promise<void> | null = null;

/** Loads the YouTube IFrame API once per page. */
function loadYouTubeApi(): Promise<void> {
  const win = window as YouTubeWindow;
  if (win.YT?.Player) return Promise.resolve();
  if (!apiPromise) {
    apiPromise = new Promise((resolve) => {
      const prev = win.onYouTubeIframeAPIReady;
      win.onYouTubeIframeAPIReady = () => {
        prev?.();
        resolve();
      };
      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(tag);
      }
    });
  }
  return apiPromise;
}

export interface PlayableClip {
  videoId: string;
  start: number;
  end: number;
  gain?: number;
}

interface Options {
  onEnded?: () => void;
  onError?: () => void;
}

/**
 * Offscreen YouTube player. Attach `hostRef` to a rendered element; the player is
 * created inside it imperatively so React never owns the iframe the API swaps in.
 */
export function useYouTubePlayer({ onEnded, onError }: Options = {}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const handlers = useRef({ onEnded, onError });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    handlers.current = { onEnded, onError };
  }, [onEnded, onError]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    const mount = document.createElement("div");
    host.appendChild(mount);

    loadYouTubeApi().then(() => {
      if (cancelled) return;
      playerRef.current = new YT.Player(mount, {
        width: 320,
        height: 180,
        playerVars: { playsinline: 1, disablekb: 1 },
        events: {
          onReady: () => {
            if (!cancelled) setReady(true);
          },
          onStateChange: (e) => {
            if (e.data === YT.PlayerState.ENDED) handlers.current.onEnded?.();
          },
          onError: () => handlers.current.onError?.(),
        },
      });
    });

    return () => {
      cancelled = true;
      try {
        playerRef.current?.destroy();
      } catch {
        // Player may not have finished initialising; nothing to clean up.
      }
      playerRef.current = null;
      host.replaceChildren();
      setReady(false);
    };
  }, []);

  const play = useCallback((clip: PlayableClip) => {
    const player = playerRef.current;
    if (!player) return;
    player.loadVideoById({ videoId: clip.videoId, startSeconds: clip.start, endSeconds: clip.end });
    player.setVolume(gainToVolume(clip.gain));
  }, []);

  /** Adjusts the volume of whatever is playing, for live tweaking. */
  const setGain = useCallback((gain: number) => {
    playerRef.current?.setVolume(gainToVolume(gain));
  }, []);

  const stop = useCallback(() => {
    playerRef.current?.stopVideo();
  }, []);

  const currentTime = useCallback(() => playerRef.current?.getCurrentTime() ?? 0, []);

  return { hostRef, ready, play, stop, currentTime, setGain };
}
