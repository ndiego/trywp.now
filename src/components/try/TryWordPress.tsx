"use client";

import { useCallback, useState } from "react";
import type { PlaygroundClient } from "@wp-playground/client";
import { DEFAULT_BLUEPRINT_ID } from "./blueprint";
import { FloatingDock } from "./controls/FloatingDock";
import { getActivePath, type TryControls } from "./destinations";
import { PlaygroundFrame, type BootStatus } from "./PlaygroundFrame";
import { WelcomeModal } from "./WelcomeModal";

/** Full-screen "Try WordPress" experience: a live Playground with floating controls on top. */
export function TryWordPress() {
  // Which blueprint is running, and a counter that remounts Playground for a fresh boot.
  const [run, setRun] = useState({ blueprintId: DEFAULT_BLUEPRINT_ID, session: 0 });
  const [client, setClient] = useState<PlaygroundClient | null>(null);
  const [status, setStatus] = useState<BootStatus>({ progress: 0, caption: "Starting WordPress" });
  const [path, setPath] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [welcome, setWelcome] = useState<"pending" | "open" | "seen">("pending");

  /** Boots a fresh site from `blueprintId`, or from the current blueprint when omitted. */
  const boot = useCallback((blueprintId?: string) => {
    setClient(null);
    setPath("");
    setError(null);
    setStatus({ progress: 0, caption: "Starting a fresh site" });
    setRun((r) => ({ blueprintId: blueprintId ?? r.blueprintId, session: r.session + 1 }));
  }, []);
  const reset = useCallback(() => boot(), [boot]);

  const onReady = useCallback((c: PlaygroundClient) => {
    // The client is a callable Comlink proxy; wrap it so React doesn't treat it as an updater.
    setClient(() => c);
    setWelcome((w) => (w === "pending" ? "open" : w));
  }, []);

  const onError = useCallback((e: unknown) => {
    console.error(e);
    setError("WordPress couldn't start in this browser.");
  }, []);

  const closeWelcome = useCallback(() => setWelcome("seen"), []);
  const goTo = useCallback((p: string) => void client?.goTo(p), [client]);

  const controls: TryControls = {
    ready: !!client,
    activePath: getActivePath(path),
    goTo,
    reset,
    showWelcome: () => setWelcome("open"),
  };

  return (
    <div className="try">
      <FloatingDock {...controls} />

      <div className="try-stage">
        <PlaygroundFrame
          key={`${run.blueprintId}:${run.session}`}
          blueprintId={run.blueprintId}
          onProgress={setStatus}
          onReady={onReady}
          onNavigate={setPath}
          onError={onError}
        />
        {!client && (
          <div className="try-loader" role="status" aria-live="polite">
            {error ? (
              <>
                <p className="try-loader__title">{error}</p>
                <div className="wp-block-button">
                  <button type="button" className="wp-block-button__link wp-element-button" onClick={reset}>
                    Try again
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="try-loader__title">Setting up your WordPress site</p>
                <div
                  className="try-loader__bar"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(status.progress)}
                >
                  <span style={{ width: `${Math.max(status.progress, 3)}%` }} />
                </div>
                <p className="try-loader__caption">{status.caption}</p>
              </>
            )}
          </div>
        )}
      </div>

      <WelcomeModal open={welcome === "open" && !!client} onClose={closeWelcome} />
    </div>
  );
}
