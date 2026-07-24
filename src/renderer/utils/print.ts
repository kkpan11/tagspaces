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

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Print a block of plain text via the OS print dialog (so the user can save it
 * as a PDF, for example), without printing the whole app window.
 *
 * The text is rendered into an off-screen iframe and that iframe is printed —
 * this avoids popup blockers and works in both the web build and Electron.
 * WKWebView / Android WebView printing is unreliable, so callers typically gate
 * this to desktop/web (e.g. `!AppConfig.isNativeMobile`).
 */
export function printText(text: string, title = ''): void {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText =
    'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.appendChild(iframe);

  const cleanup = () => {
    if (iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }
  };

  const win = iframe.contentWindow;
  if (!win) {
    cleanup();
    return;
  }

  win.document.open();
  win.document.write(
    '<html><head><title>' +
      escapeHtml(title) +
      '</title></head><body>' +
      '<pre style="white-space:pre-wrap;word-wrap:break-word;' +
      'font-family:monospace;font-size:12px;">' +
      escapeHtml(text) +
      '</pre></body></html>',
  );
  win.document.close();
  win.focus();
  win.print();
  // Give the print dialog time to grab the document before removing the iframe.
  setTimeout(cleanup, 1000);
}
