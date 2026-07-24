/*
 * Copyright (c) 2016-present - TagSpaces GmbH. All rights reserved.
 */
import { test, expect } from './fixtures';
import {
  defaultLocationName,
  createPwLocation,
  createS3Location,
} from './location.helpers';
import {
  clickOn,
  expectElementExist,
  getGridFileName,
  getGridFileSelector,
  reloadDirectory,
  takeScreenshot,
} from './general.helpers';

import { startTestingApp, stopApp } from './hook';
import { closeWelcomePlaywright } from './welcome.helpers';
import { getDirEntries } from './perspective-grid.helpers';

test.beforeAll(async ({ isWeb, isS3, webServerPort }, testInfo) => {
  if (isS3) {
    await startTestingApp({ isWeb, isS3, webServerPort, testInfo });
    await closeWelcomePlaywright();
  } else {
    await startTestingApp(
      { isWeb, isS3, webServerPort, testInfo },
      'extconfig.js',
    );
  }
});

test.afterAll(async () => {
  await stopApp();
});

/*test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== testInfo.expectedStatus) {
    await takeScreenshot(testInfo);
  }
});*/

test.beforeEach(async ({ isS3, testDataDir }) => {
  if (isS3) {
    await createS3Location('', defaultLocationName, true);
  } else {
    await createPwLocation(testDataDir, defaultLocationName, true);
  }
  await clickOn('[data-tid=location_' + defaultLocationName + ']');
  await expectElementExist(getGridFileSelector('empty_folder'), true, 15000);
  // If its have opened file
  // await closeFileProperties();
  await clickOn('[data-tid=gridPerspectiveSortMenu]');
});

// Scenarios for sorting files in grid perspective
test.describe('TST5003 - Testing sort files in the grid perspective', () => {
  test('TST5050 - Sort by name [web,s3,electron]', async ({
    testDataDir,
  }) => {
    // DESC
    await clickOn('[data-tid=gridPerspectiveSortByName]');
    let sorted = getDirEntries(testDataDir, 'byName', false);
    for (let i = 0; i < sorted.length; i += 1) {
      const fileName = await getGridFileName(i);
      expect(fileName).toBe(sorted[i].name); //'sample_exif.jpg');
    }

    // ASC
    await clickOn('[data-tid=gridPerspectiveSortMenu]');
    await clickOn('[data-tid=gridPerspectiveSortByName]');

    sorted = getDirEntries(testDataDir, 'byName', true);
    for (let i = 0; i < sorted.length; i += 1) {
      const fileName = await getGridFileName(i);
      expect(fileName).toBe(sorted[i].name); //'sample.avif');
    }
  });

  test('TST5051 - Sort by size [web,s3,electron]', async ({
    testDataDir,
  }) => {
    await clickOn('[data-tid=gridPerspectiveSortBySize]');
    // DESC
    let sorted = getDirEntries(testDataDir, 'byFileSize', true);
    for (let i = 0; i < sorted.length; i += 1) {
      const fileName = await getGridFileName(i);
      expect(fileName).toBe(sorted[i].name); //'sample.csv');
    }

    // ASC
    await clickOn('[data-tid=gridPerspectiveSortMenu]');
    await clickOn('[data-tid=gridPerspectiveSortBySize]');
    sorted = getDirEntries(testDataDir, 'byFileSize', false);
    for (let i = 0; i < sorted.length; i += 1) {
      const fileName = await getGridFileName(i);
      expect(fileName).toBe(sorted[i].name); //'sample.nef');
    }
  });

  test('TST5052 - Sort by date [web,s3,electron]', async ({
    testDataDir,
  }) => {
    await clickOn('[data-tid=gridPerspectiveSortByDate]');

    let sorted = getDirEntries(testDataDir, 'byDateModified', true);
    for (let i = 0; i < sorted.length; i += 1) {
      const fileName = await getGridFileName(i);
      expect(fileName).toBe(sorted[i].name);
    }

    // ASC
    await clickOn('[data-tid=gridPerspectiveSortMenu]');
    await clickOn('[data-tid=gridPerspectiveSortByDate]');

    sorted = getDirEntries(testDataDir, 'byDateModified', false);
    for (let i = 0; i < sorted.length; i += 1) {
      const fileName = await getGridFileName(i);
      expect(fileName).toBe(sorted[i].name);
    }
  });

  test('TST5053 - Sort by extension [web,s3,electron]', async ({
    testDataDir,
  }) => {
    await clickOn('[data-tid=gridPerspectiveSortByExt]');
    let sorted = getDirEntries(testDataDir, 'byExtension', true);
    for (let i = 0; i < sorted.length; i += 1) {
      const fileName = await getGridFileName(i);
      expect(fileName).toBe(sorted[i].name);
    }

    await clickOn('[data-tid=gridPerspectiveSortMenu]');
    await clickOn('[data-tid=gridPerspectiveSortByExt]');
    sorted = getDirEntries(testDataDir, 'byExtension', false);
    for (let i = 0; i < sorted.length; i += 1) {
      const fileName = await getGridFileName(i);
      expect(fileName).toBe(sorted[i].name);
    }
  });

  test('TST5054 - Sort by tags [web,s3,electron]', async ({
    testDataDir,
  }) => {
    await clickOn('[data-tid=gridPerspectiveSortByFirstTag]');
    let sorted = getDirEntries(testDataDir, 'byFirstTag', true);
    for (let i = 0; i < sorted.length; i += 1) {
      const fileName = await getGridFileName(i);
      expect(fileName).toBe(sorted[i].name);
    }
    // ASC
    await clickOn('[data-tid=gridPerspectiveSortMenu]');
    await clickOn('[data-tid=gridPerspectiveSortByFirstTag]');
    sorted = getDirEntries(testDataDir, 'byFirstTag', false);
    for (let i = 0; i < sorted.length; i += 1) {
      const fileName = await getGridFileName(i);
      expect(fileName).toBe(sorted[i].name);
    }
  });

  // Regression guard for the SortedDirContextProvider reset effect (keyed only
  // on currentDirectory.path): a non-default sort must survive a same-directory
  // reload — the path the automatic "reload on focus" also uses
  // (openDirectory(currentDirectoryPath)) — instead of reverting to byName.
  test('TST5055 - Sort persists after directory reload [web,s3,electron]', async ({
    testDataDir,
  }) => {
    // Pick a non-default criterion (default is byName asc) → size, descending.
    await clickOn('[data-tid=gridPerspectiveSortBySize]');
    const sorted = getDirEntries(testDataDir, 'byFileSize', true);
    for (let i = 0; i < sorted.length; i += 1) {
      const fileName = await getGridFileName(i);
      expect(fileName).toBe(sorted[i].name);
    }

    // Reload the same directory — must keep the chosen sort, not reset it.
    await reloadDirectory();
    await expectElementExist(getGridFileSelector('empty_folder'), true, 15000);
    for (let i = 0; i < sorted.length; i += 1) {
      const fileName = await getGridFileName(i);
      expect(fileName).toBe(sorted[i].name);
    }
  });
});
