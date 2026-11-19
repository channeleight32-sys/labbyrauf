import React, { useEffect, useState, useRef } from "react";

/**
 * Checks whether OS reduced-motion OR explicit workstation ws-reduced-motion override is active.
 */
export function isDocumentReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  const osReduced = Boolean(
    window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  const wsReduced =
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("ws-reduced-motion");
  return osReduced || wsReduced;
}

/**
 * Tracks OS/browser prefers-reduced-motion setting AND the workstation
 * `ws-reduced-motion` root class so animations and 3D loops gracefully pause.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => isDocumentReducedMotion());

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia
      ? window.matchMedia("(prefers-reduced-motion: reduce)")
      : null;
    const onChange = () => setReduced(isDocumentReducedMotion());
    onChange();
    mq?.addEventListener("change", onChange);

    let observer: MutationObserver | null = null;
    if (typeof document !== "undefined" && typeof MutationObserver !== "undefined") {
      observer = new MutationObserver(onChange);
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
      });
    }

    return () => {
      mq?.removeEventListener("change", onChange);
      observer?.disconnect();
    };
  }, []);

  return reduced;
}

/**
 * Tracks whether the browser tab is currently visible so background loops pause cleanly.
 */
export function usePageVisibility(): boolean {
  const [visible, setVisible] = useState<boolean>(() => {
    if (typeof document === "undefined") return true;
    return document.visibilityState !== "hidden";
  });

  useEffect(() => {
    if (typeof document === "undefined") return;
    const onVis = () => setVisible(document.visibilityState !== "hidden");
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  return visible;
}

interface AnimatedNumberProps {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  durationMs?: number;
  className?: string;
}

/**
 * Smoothly counts numeric telemetry/dashboard metrics on mount & updates using RAF.
 * Immediately snaps when prefers-reduced-motion is enabled.
 */
export function AnimatedNumber({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  durationMs = 520,
  className = "",
}: AnimatedNumberProps) {
  const reduced = usePrefersReducedMotion();
  const [display, setDisplay] = useState<number>(value);
  const currentRef = useRef<number>(value);

  useEffect(() => {
    if (reduced || !isFinite(value)) {
      currentRef.current = value;
      setDisplay(value);
      return;
    }

    const from = currentRef.current;
    const to = value;
    if (Math.abs(to - from) < 1e-6) {
      setDisplay(to);
      return;
    }

    let rafId = 0;
    const start = performance.now();

    const step = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / durationMs);
      // Cubic ease-out
      const eased = 1 - Math.pow(1 - t, 3);
      const next = from + (to - from) * eased;
      currentRef.current = next;
      setDisplay(next);
      if (t < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        currentRef.current = to;
        setDisplay(to);
      }
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [value, durationMs, reduced]);

  return (
    <span className={`tabular-nums ${className}`}>
      {prefix}
      {display.toFixed(decimals)}
      {suffix}
    </span>
  );
}
