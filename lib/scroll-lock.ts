/**
 * Reference-counted `body { overflow: hidden }`.
 *
 * Several things can block scrolling at once — the boot loader, a blocking
 * overlay on top of it. Each one saving and restoring the previous value
 * independently means the inner one restores "hidden" and the page never
 * scrolls again. Counting instead: the lock lifts only when the last holder
 * releases it.
 */

let holders = 0;
let previousOverflow = "";

/** Returns the release function. Calling it twice is a no-op. */
export function lockBodyScroll(): () => void {
  if (typeof document === "undefined") return () => {};

  if (holders === 0) {
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  holders += 1;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    holders -= 1;
    if (holders === 0) {
      document.body.style.overflow = previousOverflow;
    }
  };
}
