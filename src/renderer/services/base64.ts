/**
 * TagSpaces - universal file and folder organizer
 * Copyright (C) 2024-present TagSpaces GmbH
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

/**
 * Encode binary image data as a base64 string.
 *
 * Built in fixed-size chunks on purpose: `String.fromCharCode.apply(null, all)`
 * spreads every byte as a separate function argument, which throws
 * `RangeError: Maximum call stack size exceeded` for anything but a tiny image.
 * 32k-byte chunks keep each `apply` call well under the engine's argument
 * limit while still encoding arbitrarily large buffers.
 *
 * Kept dependency-free (own module) so it stays unit-testable without pulling
 * in the heavy utils-io graph.
 */
// eslint-disable-next-line import/prefer-default-export
export function toBase64Image(
  uint8Array: Uint8Array | null | undefined,
): string | undefined {
  if (!uint8Array || uint8Array.length === 0) {
    return undefined;
  }
  try {
    let binary = '';
    const chunkSize = 0x8000; // 32k
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, chunk as any);
    }
    return btoa(binary);
  } catch (e) {
    console.error('toBase64Image error:', e);
    return undefined;
  }
}
