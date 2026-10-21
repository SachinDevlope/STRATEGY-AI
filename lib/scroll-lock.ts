// Counted scroll lock: several overlays can lock at once, and scrolling
// returns only when the last one releases.

let holders = 0;
let previousOverflow = "";

/** Returns a release function (safe to call twice). */
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
