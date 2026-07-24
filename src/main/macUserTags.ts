/**
 * TagSpaces - universal file and folder organizer
 * Copyright (C) 2017-present TagSpaces GmbH
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
 * macOS Finder tags. Kept out of `util.ts` (which imports electron) so the pure
 * parser can be unit-tested in plain Node; `readMacOSTags` only needs
 * `child_process`.
 */
import { execFile } from 'child_process';

const MAC_USER_TAGS_ATTR = 'com.apple.metadata:_kMDItemUserTags';

/**
 * Pure parser for macOS Finder tags. Finder tags live in the
 * `com.apple.metadata:_kMDItemUserTags` extended attribute as a binary plist
 * holding an array of strings. Each entry is either a bare tag name
 * (`"Important"`) or, when a Finder color is assigned, `"Name\nColorIndex"`
 * (e.g. `"Important\n4"`). This takes the already-decoded array (e.g. plutil's
 * JSON output) and returns clean tag objects.
 */
export function parseMacUserTags(parsed: unknown): { title: string }[] {
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed
    .map((entry) => String(entry).split('\n')[0].trim())
    .filter((title) => title.length > 0)
    .map((title) => ({ title }));
}

/**
 * Read macOS Finder tags for a file.
 *
 * Reads the `com.apple.metadata:_kMDItemUserTags` extended attribute directly
 * (a binary plist) instead of `mdls`. `mdls` only surfaces tags that Spotlight
 * has indexed, so it returns "could not find …" / null on volumes or folders
 * that aren't indexed (Spotlight disabled, external/network drives, freshly
 * written files) even though the tags are present on disk — which made the
 * Finder-tag import silently return nothing. The xattr is the source of truth.
 *
 * @param filename absolute path
 * @returns {Promise<{ title: string }[]>}
 */
export async function readMacOSTags(filename) {
  return new Promise((resolve, reject) => {
    // Dump the attribute as hex (the binary plist). Missing attribute → xattr
    // exits non-zero → no tags.
    execFile(
      '/usr/bin/xattr',
      ['-px', MAC_USER_TAGS_ATTR, filename],
      (xErr, xOut) => {
        if (xErr) {
          return resolve([]);
        }
        const hex = (xOut || '').replace(/\s+/g, '');
        if (!hex) {
          return resolve([]);
        }
        // Decode the binary plist to JSON via plutil (reads bytes from stdin).
        const plutil = execFile(
          '/usr/bin/plutil',
          ['-convert', 'json', '-o', '-', '-'],
          (pErr, pOut) => {
            if (pErr) {
              return reject(pErr);
            }
            try {
              resolve(parseMacUserTags(JSON.parse(pOut)));
            } catch (e) {
              reject(e);
            }
          },
        );
        plutil.stdin.write(Buffer.from(hex, 'hex'));
        plutil.stdin.end();
      },
    );
  });
}
