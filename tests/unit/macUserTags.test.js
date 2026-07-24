import { describe, expect, test } from '@playwright/test';
import { parseMacUserTags } from '../../src/main/macUserTags';

// The arrays below mirror what `plutil -convert json` produces when decoding the
// com.apple.metadata:_kMDItemUserTags binary plist, e.g. the payload
// plistlib.dumps(['Important\n4', 'Two Words\n6']) decodes to
// ['Important\n4', 'Two Words\n6'].
describe('parseMacUserTags', () => {
  test('strips the "\\nColorIndex" suffix, trims and drops empties', () => {
    expect(
      parseMacUserTags([
        'Important\n4',
        'Two Words\n6',
        'Plain',
        '  Spaced  \n2',
        '',
      ]),
    ).toEqual([
      { title: 'Important' },
      { title: 'Two Words' },
      { title: 'Plain' },
      { title: 'Spaced' },
    ]);
  });

  test('tags without a color index pass through unchanged', () => {
    expect(parseMacUserTags(['Red', 'Blue'])).toEqual([
      { title: 'Red' },
      { title: 'Blue' },
    ]);
  });

  test('non-array / empty input → []', () => {
    expect(parseMacUserTags(null)).toEqual([]);
    expect(parseMacUserTags(undefined)).toEqual([]);
    expect(parseMacUserTags('Important')).toEqual([]);
    expect(parseMacUserTags([])).toEqual([]);
  });
});
