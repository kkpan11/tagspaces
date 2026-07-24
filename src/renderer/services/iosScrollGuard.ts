/**
 * TagSpaces - universal file and folder organizer
 * Copyright (C) 2026-present TagSpaces GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License (version 3) as
 * published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 */

import AppConfig from '-/AppConfig';

/**
 * iOS (WKWebView) phantom-scroll guard.
 *
 * The app shell pins `body`/`html` with `overflow: hidden` (app.global.css), so
 * the document itself should never scroll — all real scrolling happens in inner
 * `overflow: auto` containers. WKWebView nonetheless scrolls the whole document
 * up (~20px) to bring a focused input above the keyboard, or on a rubber-band
 * gesture, and frequently leaves it stuck there — the user then sees the entire
 * UI shifted up until the app is restarted.
 *
 * This snaps the document back to the top whenever it drifts, but deliberately
 * NOT while a field is being edited, so we don't fight iOS scrolling a focused
 * input into view. iOS-only (Capacitor); a no-op everywhere else.
 */
export function installIosScrollGuard(): void {
  if (!AppConfig.isCapacitoriOS) return;

  const isEditing = (): boolean => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return false;
    return (
      el.tagName === 'INPUT' ||
      el.tagName === 'TEXTAREA' ||
      // Focus inside an extension/editor iframe surfaces on the PARENT document
      // as the <iframe> element itself (we can't see the input within it,
      // especially cross-origin). Treat it as editing so we don't pin the page
      // back to 0 and fight iOS scrolling the iframe's content above the
      // keyboard — otherwise the bottom of an edited file is unreachable.
      el.tagName === 'IFRAME' ||
      el.isContentEditable
    );
  };

  // The soft keyboard is open when the visual viewport is noticeably shorter
  // than the layout viewport (in a native app there's no URL bar, so the only
  // thing that shrinks it is the keyboard). 100px threshold avoids false
  // positives from minor viewport jitter.
  const keyboardOpen = (): boolean => {
    const vv = window.visualViewport;
    return !!vv && window.innerHeight - vv.height > 100;
  };

  // Allow the page to scroll ONLY while genuinely editing AND the keyboard is up
  // (iOS needs to lift the field/iframe content above it). Once the keyboard
  // closes we pin again even if the iframe keeps focus — otherwise the ~20px
  // shift it left behind would stick. If visualViewport is unavailable we can't
  // detect the keyboard, so fall back to "editing means allow" (blur still pins).
  const shouldAllowScroll = (): boolean => {
    if (!isEditing()) return false;
    return window.visualViewport ? keyboardOpen() : true;
  };

  const pin = (): void => {
    const scroller = (document.scrollingElement ||
      document.documentElement) as HTMLElement | null;
    if (scroller && scroller.scrollTop !== 0) scroller.scrollTop = 0;
    if (window.scrollY !== 0 || window.scrollX !== 0) window.scrollTo(0, 0);
  };

  // A stray document scroll while we're not legitimately editing → snap back.
  window.addEventListener(
    'scroll',
    () => {
      if (!shouldAllowScroll()) pin();
    },
    { passive: true },
  );

  // The shift most often "sticks" when the keyboard dismisses / a field blurs.
  // Defer so it runs after focus settles and after the keyboard-hide animation;
  // skip if focus merely moved to another field (keyboard still up).
  document.addEventListener(
    'focusout',
    () => {
      setTimeout(() => {
        if (!shouldAllowScroll()) pin();
      }, 0);
      setTimeout(() => {
        if (!shouldAllowScroll()) pin();
      }, 300);
    },
    { passive: true },
  );

  // visualViewport resizes on keyboard show/hide. This is the key trigger for
  // the iframe case: when the keyboard closes (viewport grows back), the iframe
  // can still hold focus, so shouldAllowScroll() flips to false here and we pin
  // away the leftover shift.
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
      if (!shouldAllowScroll()) pin();
    });
  }
}
