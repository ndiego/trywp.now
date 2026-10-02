"use client";

import { useEffect, useRef } from "react";
import type { PlaygroundClient, StartPlaygroundWebOptions } from "@wp-playground/client";
import { PLAYGROUND_REMOTE_URL, getTryBlueprint } from "./blueprint";

export type BootStatus = { progress: number; caption: string };

type Props = {
  onProgress: (status: BootStatus) => void;
  onReady: (client: PlaygroundClient) => void;
  onNavigate: (url: string) => void;
  onError: (error: unknown) => void;
};

/**
 * Boots WordPress Playground into an iframe it owns. Each mount creates a fresh
 * iframe (and a fresh WordPress), so remounting with a new `key` resets the site.
 */
export function PlaygroundFrame({ onProgress, onReady, onNavigate, onError }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Keep callbacks current without re-booting Playground when they change.
  const callbacks = useRef({ onProgress, onReady, onNavigate, onError });
  useEffect(() => {
    callbacks.current = { onProgress, onReady, onNavigate, onError };
  });

  useEffect(() => {
    const container = containerRef.current!;
    const iframe = document.createElement("iframe");
    iframe.title = "WordPress Playground";
    iframe.className = "try-frame__iframe";
    container.appendChild(iframe);
    let cancelled = false;

    (async () => {
      const [{ startPlaygroundWeb }, { ProgressTracker }] = await Promise.all([
        import("@wp-playground/client"),
        import("@php-wasm/progress"),
      ]);
      const tracker = new ProgressTracker();
      tracker.addEventListener("progress", (e: Event) => {
        const { progress, caption } = (e as CustomEvent<BootStatus>).detail;
        if (!cancelled) callbacks.current.onProgress({ progress, caption });
      });

      const client = await startPlaygroundWeb({
        iframe,
        remoteUrl: PLAYGROUND_REMOTE_URL,
        blueprint: getTryBlueprint(window.location.origin),
        // Same class, but a separately bundled copy, so the nominal types differ.
        progressTracker: tracker as unknown as StartPlaygroundWebOptions["progressTracker"],
        disableProgressBar: true,
      });
      if (cancelled) return;
      await client.onNavigation((url) => !cancelled && callbacks.current.onNavigate(url));
      callbacks.current.onNavigate(await client.getCurrentURL());
      callbacks.current.onReady(client);
    })().catch((error) => !cancelled && callbacks.current.onError(error));

    return () => {
      cancelled = true;
      iframe.remove();
    };
  }, []);

  return <div ref={containerRef} className="try-frame" />;
}
