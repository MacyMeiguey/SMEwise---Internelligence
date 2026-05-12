/**
 * GlobalProgressBar — fixed 4px bar at the top of the page.
 * Visible whenever any Widget is in a loading state.
 * Requirements: 22.1
 */

import { useLoadingCount } from "../context/LoadingContext";

export default function GlobalProgressBar() {
  const count = useLoadingCount();
  if (count === 0) return null;

  return (
    <div
      role="progressbar"
      aria-label="AI generation in progress"
      aria-busy="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: "4px",
        background: "var(--brand-violet, #7c3aed)",
        zIndex: 9999,
        animation: "progressBar 2s ease-in-out infinite alternate",
        width: "100%",
      }}
    />
  );
}
