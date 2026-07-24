import { useDirectoryContentContext } from '-/hooks/useDirectoryContentContext';
import { useEffect, useRef } from 'react';

// A single return to the app fires several DOM events in quick succession
// (window 'focus' plus a 'visibilitychange' to 'visible' when the window had
// been hidden/minimized). They are coalesced into one reload within this window.
const RELOAD_DEBOUNCE_MS = 300;

/**
 * Custom hook to reload data when the window returns to the foreground.
 *
 * Both `focus` and `visibilitychange` are observed on purpose: in Electron a
 * minimized/hidden window only emits `visibilitychange`, while alt-tabbing to
 * another app with the window still visible only emits `focus`/`blur`. To avoid
 * reloading more than once per return, the events are (a) gated on a genuine
 * preceding away period (a `blur` or a `visibilitychange` to `hidden`) so a bare
 * focus — e.g. closing DevTools or a dialog while the window stayed visible —
 * does not reload, and (b) coalesced through a short debounce.
 *
 * @param reloadOnFocus - Flag to enable/disable reload behavior.
 * @param reloadFn - Callback to invoke when a reload should occur.
 */
export function useReloadOnFocus(
  reloadOnFocus: boolean,
  reloadFn: () => void,
): void {
  const { isSearchMode } = useDirectoryContentContext();

  // Capture the latest values without re-subscribing the listeners. Callers
  // pass a fresh inline `reloadFn` on every render, so depending on it directly
  // would tear down and re-add the listeners on each render.
  const reloadFnRef = useRef(reloadFn);
  reloadFnRef.current = reloadFn;
  const isSearchModeRef = useRef(isSearchMode);
  isSearchModeRef.current = isSearchMode;

  useEffect(() => {
    if (!reloadOnFocus) return undefined;

    let debounceTimer: ReturnType<typeof setTimeout> | undefined;
    // Only reload after a real away period; initialize from the current state
    // in case the window mounts while hidden.
    let wasAway = document.visibilityState === 'hidden';

    const scheduleReload = () => {
      if (!wasAway) return; // ignore focus that wasn't preceded by an away period
      wasAway = false;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        // Re-check at fire time — search mode may have been entered meanwhile.
        if (isSearchModeRef.current) return;
        reloadFnRef.current();
      }, RELOAD_DEBOUNCE_MS);
    };

    const handleBlur = () => {
      wasAway = true;
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        wasAway = true;
      } else {
        scheduleReload();
      }
    };

    const handleWindowFocus = () => {
      scheduleReload();
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [reloadOnFocus]);
}
