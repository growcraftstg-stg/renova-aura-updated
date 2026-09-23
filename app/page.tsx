"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Step = "ask" | "write" | "revealed";

const TAUNTS = [
  "Nice try 😏",
  "Too slow!",
  "That button is shy.",
  "Nope, not that one.",
  "Just tell me already!",
  "You can't escape the surprise.",
  "Missed again 🙈",
];

const FORMSPREE_ENDPOINT = "https://formspree.io/f/xzezgzkl";

const CONFETTI_COLORS =["#f2b705", "#1e2a38", "#3b82f6", "#22a06b", "#94a3b8"];

export default function Home() {
  const [step, setStep] = useState<Step>("ask");
  const [surprise, setSurprise] = useState("");
  const [noPos, setNoPos] = useState<{ left: number; top: number } | null>(null);
  const [taunt, setTaunt] = useState("");
  const [showGuard, setShowGuard] = useState(false);
  const [allowLeave, setAllowLeave] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [confetti, setConfetti] = useState<
    { id: number; left: number; color: string; duration: number; delay: number }[]
  >([]);
  const noRef = useRef<HTMLButtonElement>(null);
  const escapes = useRef(0);

  /* ---------- the runaway "No" button ---------- */
  const runAway = useCallback(() => {
    const btn = noRef.current;
    if (!btn) return;
    const w = btn.offsetWidth;
    const h = btn.offsetHeight;
    const pad = 16;
    const maxLeft = window.innerWidth - w - pad;
    const maxTop = window.innerHeight - h - pad;

    // pick a spot that is far enough from the current one
    let left = 0;
    let top = 0;
    const cur = btn.getBoundingClientRect();
    for (let i = 0; i < 10; i++) {
      left = pad + Math.random() * Math.max(0, maxLeft - pad);
      top = pad + Math.random() * Math.max(0, maxTop - pad);
      if (Math.hypot(left - cur.left, top - cur.top) > 150) break;
    }
    setNoPos({ left, top });
    escapes.current += 1;
    setTaunt(TAUNTS[escapes.current % TAUNTS.length]);
  }, []);

  /* ---------- "can't close without permission" ---------- */
  useEffect(() => {
    if (allowLeave) return;

    // 1. Closing the tab / refreshing -> browser shows "Leave site?" dialog
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    // 2. Pressing the browser Back button -> stay on page and show our guard
    history.pushState(null, "", location.href);
    const onPopState = () => {
      history.pushState(null, "", location.href);
      setShowGuard(true);
    };

    // 3. Escape / Ctrl+W style shortcuts -> show our guard
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowGuard(true);
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "w") {
        e.preventDefault(); // browsers usually ignore this, beforeunload is the real guard
        setShowGuard(true);
      }
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("popstate", onPopState);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("keydown", onKey);
    };
  }, [allowLeave]);

  /* ---------- fullscreen (hides the tab bar and close button) ---------- */
  useEffect(() => {
    if (allowLeave) {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      return;
    }

    // Browsers only allow fullscreen from a user gesture, so enter it on the
    // first click/tap/key press, and again after every one if the user exited it.
    const enterFullscreen = () => {
      if (document.fullscreenElement) return;
      document.documentElement.requestFullscreen?.().catch(() => {});
    };

    // Leaving fullscreen (e.g. with Esc) -> show our guard
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) setShowGuard(true);
    };

    window.addEventListener("pointerdown", enterFullscreen);
    window.addEventListener("keydown", enterFullscreen);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      window.removeEventListener("pointerdown", enterFullscreen);
      window.removeEventListener("keydown", enterFullscreen);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, [allowLeave]);

  /* ---------- actions ---------- */
  const revealSurprise = async () => {
    if (!surprise.trim() || sending) return;
    setSending(true);
    setSendError("");
    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ surprise }),
      });
      if (!res.ok) throw new Error(`Formspree responded ${res.status}`);
    } catch {
      setSendError("Couldn't send the surprise. Please try again.");
      setSending(false);
      return;
    }
    setSending(false);
    setStep("revealed");
    setAllowLeave(true); // surprise told -> permission granted
    setConfetti(
      Array.from({ length: 80 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        duration: 2.5 + Math.random() * 2.5,
        delay: Math.random() * 0.8,
      }))
    );
  };

  const startOver = () => {
    setStep("ask");
    setSurprise("");
    setNoPos(null);
    setTaunt("");
    setConfetti([]);
    setAllowLeave(false);
    escapes.current = 0;
  };

  return (
    <>
      <main className="stage">
        <section className="card">
          {step === "ask" && (
            <>
              <h1 className="headline">What&apos;s the surprise?</h1>
              <p className="sub">Come on, friend. I know you&apos;ve got something.</p>

              <div className="buttons">
                <button className="btn btn-yes" onClick={() => setStep("write")}>
                  Tell the surprise
                </button>

                <button
                  ref={noRef}
                  className={`btn btn-no ${noPos ? "fleeing" : ""}`}
                  style={noPos ? { left: noPos.left, top: noPos.top } : undefined}
                  onMouseEnter={runAway}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    runAway();
                  }}
                  onFocus={runAway}
                  onClick={(e) => {
                    e.preventDefault();
                    runAway();
                  }}
                >
                  No, I won&apos;t tell
                </button>
              </div>

              <p className="taunt" aria-live="polite">{taunt}</p>
            </>
          )}

          {step === "write" && (
            <>
              <h1 className="headline">
                Okay, tell me!
              </h1>
              <p className="sub">Type the surprise below. No one leaves until it&apos;s out.</p>
              <label htmlFor="surprise" className="sr-only">
                Your surprise
              </label>
              <textarea
                id="surprise"
                autoFocus
                placeholder="The surprise is…"
                value={surprise}
                onChange={(e) => setSurprise(e.target.value)}
                maxLength={300}
              />
              <button
                className="btn btn-yes"
                onClick={revealSurprise}
                disabled={!surprise.trim() || sending}
              >
                {sending ? "Sending…" : "Reveal the surprise"}
              </button>
              <p className="taunt" aria-live="polite">{sendError}</p>
            </>
          )}

          {step === "revealed" && (
            <>
              <p className="sub" style={{ marginBottom: 0 }}>The surprise is…</p>
              <p className="reveal">{surprise}</p>
              <button className="btn btn-yes" onClick={startOver}>
                Start over
              </button>
            </>
          )}
        </section>
      </main>

      {confetti.map((c) => (
        <span
          key={c.id}
          className="confetti"
          style={{
            left: `${c.left}vw`,
            background: c.color,
            animationDuration: `${c.duration}s`,
            animationDelay: `${c.delay}s`,
          }}
        />
      ))}

      {showGuard && (
        <div className="guard" role="dialog" aria-modal="true" aria-labelledby="guard-title">
          <div className="card" style={{ maxWidth: 440 }}>
            <h2 id="guard-title" className="headline" style={{ fontSize: "2.2rem" }}>
              Not so fast!
            </h2>
            <p className="sub">You can&apos;t leave until you tell the surprise.</p>
            <div className="buttons">
              <button
                className="btn btn-yes"
                onClick={() => {
                  setShowGuard(false);
                  setStep("write");
                }}
              >
                Fine, I&apos;ll tell
              </button>
              <button
                className="btn btn-no"
                onClick={() => {
                  setAllowLeave(true);
                  setShowGuard(false);
                }}
              >
                Let me go (please)
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
