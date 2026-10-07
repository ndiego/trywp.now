"use client";

import { useCallback, useState } from "react";
import type { PlaygroundClient } from "@wp-playground/client";
import { DEFAULT_BLUEPRINT_ID, DEFAULT_VERSIONS, getRequestedVersions } from "./blueprint";
import { FloatingDock } from "./controls/FloatingDock";
import { getActivePath, type TryControls } from "./destinations";
import { PlaygroundFrame, type BootStatus } from "./PlaygroundFrame";
import { ResetModal } from "./ResetModal";
import { WelcomeModal } from "./WelcomeModal";

/** The running WordPress's version ("7.1.2"), read from wp-includes/version.php. */
async function getWordPressVersion(client: PlaygroundClient): Promise<string | null> {
  const source = await client.readFileAsText("/wordpress/wp-includes/version.php");
  return source.match(/\$wp_version\s*=\s*'([^']+)'/)?.[1] ?? null;
}

/** Full-screen "Try WordPress" experience: a live Playground with floating controls on top. */
export function TryWordPress() {
  // Which blueprint is running, and a counter that remounts Playground for a fresh boot.
  const [run, setRun] = useState({ blueprintId: DEFAULT_BLUEPRINT_ID, session: 0 });
  const [client, setClient] = useState<PlaygroundClient | null>(null);
  const [status, setStatus] = useState<BootStatus>({ progress: 0, caption: "Starting WordPress" });
  const [path, setPath] = useState("");
  // Why the boot failed, and the WordPress version asked for with ?wp= (null for the default).
  const [error, setError] = useState<{ message: string; wp: string | null } | null>(null);
  const [welcome, setWelcome] = useState<"pending" | "open" | "seen">("pending");
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [wpVersion, setWpVersion] = useState<string | null>(null);

  /** Boots a fresh site from `blueprintId`, or from the current blueprint when omitted. */
  const boot = useCallback((blueprintId?: string) => {
    setClient(null);
    setPath("");
    setError(null);
    setStatus({ progress: 0, caption: "Starting a fresh site" });
    setRun((r) => ({ blueprintId: blueprintId ?? r.blueprintId, session: r.session + 1 }));
  }, []);
  const reset = useCallback(() => boot(), [boot]);
  /** Drops ?wp= from the URL and boots the latest release instead. */
  const bootLatest = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete("wp");
    window.history.replaceState(null, "", url);
    boot();
  }, [boot]);

  const onReady = useCallback((c: PlaygroundClient) => {
    // Read the version the welcome shows (a quick file read) before marking the site
    // ready, so the dock can't open another dialog before the welcome appears.
    getWordPressVersion(c)
      .then(setWpVersion, () => setWpVersion(null))
      .finally(() => {
        // The client is a callable Comlink proxy; wrap it so React doesn't treat it as an updater.
        setClient(() => c);
        setWelcome((w) => (w === "pending" ? "open" : w));
      });
  }, []);

  const onError = useCallback((e: unknown) => {
    console.error(e);
    // ?wp= accepts any release number, so a version that doesn't exist fails here.
    const { wp } = getRequestedVersions(window.location.search);
    setError(
      wp === DEFAULT_VERSIONS.wp
        ? { message: "WordPress couldn't start in this browser.", wp: null }
        : { message: `WordPress ${wp} couldn't start. It may not be a version Playground can run.`, wp },
    );
  }, []);

  const closeWelcome = useCallback(() => setWelcome("seen"), []);
  const cancelReset = useCallback(() => setConfirmingReset(false), []);
  const confirmReset = useCallback(() => {
    setConfirmingReset(false);
    reset();
  }, [reset]);
  const goTo = useCallback((p: string) => void client?.goTo(p), [client]);

  const controls: TryControls = {
    ready: !!client,
    activePath: getActivePath(path),
    goTo,
    // The dock asks first; "Try again" after a failed boot resets straight away.
    reset: () => setConfirmingReset(true),
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
                <p className="try-loader__title">{error.message}</p>
                <div className="wp-block-buttons">
                  {error.wp && (
                    <div className="wp-block-button">
                      <button type="button" className="wp-block-button__link wp-element-button" onClick={bootLatest}>
                        Use the latest version
                      </button>
                    </div>
                  )}
                  <div className={`wp-block-button${error.wp ? " is-style-outline" : ""}`}>
                    <button type="button" className="wp-block-button__link wp-element-button" onClick={reset}>
                      Try again
                    </button>
                  </div>
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

      <WelcomeModal open={welcome === "open" && !!client} onClose={closeWelcome} version={wpVersion} />
      <ResetModal open={confirmingReset} onCancel={cancelReset} onConfirm={confirmReset} />
    </div>
  );
}
