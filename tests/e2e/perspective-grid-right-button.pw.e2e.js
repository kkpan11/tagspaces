/*
 * Copyright (c) 2016-present - TagSpaces UG (Haftungsbeschraenkt). All rights reserved.
 */

import { expect, test } from '@playwright/test';
import {
  defaultLocationPath,
  defaultLocationName,
  renameFileFromMenu,
  deleteFileFromMenu,
  createPwMinioLocation,
  createPwLocation,
} from './location.helpers';
import { searchEngine } from './search.helpers';
import { openContextEntryMenu, toContainTID } from './test-utils';
import {
  clickOn,
  createNewDirectory,
  createTxtFile,
  expectElementExist,
  generateFileName,
  getGridFileSelector,
  reloadDirectory,
  removeTagFromTagMenu,
  selectorFile,
  selectorFolder,
  selectRowFiles,
  setInputKeys,
  setGridOptions,
  showFilesWithTag,
  frameLocator,
  takeScreenshot,
} from './general.helpers';
import { AddRemoveTagsToSelectedFiles } from './perspective-grid.helpers';
import { startTestingApp, stopApp, testDataRefresh } from './hook';
import { clearDataStorage } from './welcome.helpers';

const testTagName = 'testTag'; // TODO fix camelCase tag name

test.beforeAll(async () => {
  await startTestingApp('extconfig.js');
  // await clearDataStorage();
});

test.afterAll(async () => {
  await stopApp();
  await testDataRefresh();
});

test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== testInfo.expectedStatus) {
    await takeScreenshot(testInfo);
  }
  await clearDataStorage();
});

test.beforeEach(async () => {
  if (global.isMinio) {
    await createPwMinioLocation('', defaultLocationName, true);
  } else {
    await createPwLocation(defaultLocationPath, defaultLocationName, true);
  }
  await clickOn('[data-tid=location_' + defaultLocationName + ']');
  // If its have opened file
  // await closeFileProperties();
});
// Test the functionality of the right button on a file on a grid perspective table
// Scenarios for right button on a file
test.describe('TST50** - Right button on a file', () => {
  test('TST5016 - Open file [web,minio,electron]', async () => {
    // await searchEngine('txt');
    await openContextEntryMenu(
      getGridFileSelector('sample.txt'), // perspectiveGridTable + firstFile,
      'fileMenuOpenFile',
    );
    // await takeScreenshot('fileMenuOpenFile');
    await expect
      .poll(
        async () => {
          const fLocator = await frameLocator();
          const bodyTxt = await fLocator.locator('body').innerText();
          return toContainTID(bodyTxt);
        },
        {
          message: 'make sure bodyTxt contain etete&5435', // custom error message
          // Poll for 10 seconds; defaults to 5 seconds. Pass 0 to disable timeout.
          timeout: 10000,
        },
      )
      .toBe(true);
    // await takeScreenshot('bodyTxt_fileMenuOpenFile');

    /*const containTID = toContainTID(bodyTxt);
    if (!containTID) {
      console.debug('no containTID in:' + bodyTxt);
    }
    expect(containTID).toBe(true);*/
    // Check if the file is opened
    // await delay(1500);
    /*await expectElementExist('#FileViewer', true, 2000);
    const webViewer = await global.client.waitForSelector('#FileViewer');
    // await webViewer.waitForDisplayed();
    // await delay(5000);
    // expect(await webViewer.isDisplayed()).toBe(true);
    const iframe = await webViewer.contentFrame();
    // await global.client.switchToFrame(webViewer);
    // await isElementDisplayed(iframeBody,'body');
    const iframeBody = await iframe.waitForSelector('body');
    const bodyTxt = await iframeBody.innerText();
    const containTID = toContainTID(bodyTxt);
    if (!containTID) {
      console.debug('no containTID in:' + bodyTxt);
    }
    expect(containTID).toBe(true);*/
  });

  test('TST5017 - Rename file [web,minio,electron]', async () => {
    const newFileName = 'newFileName';
    const fileExtension = '.txt';
    // await searchEngine('txt');
    const sampleFileName = 'sample.txt';
    const oldName = await renameFileFromMenu(
      newFileName,
      getGridFileSelector(sampleFileName),
    );
    expect(oldName).toBe(sampleFileName);

    await expectElementExist(getGridFileSelector(newFileName + fileExtension));
    await expectElementExist(getGridFileSelector(oldName), false);

    // const fileNameTxt = await getFirstFileName();
    // expect(fileNameTxt).toContain(newFileName);

    // rename back to oldName
    const fileName = await renameFileFromMenu(
      oldName,
      getGridFileSelector(newFileName + fileExtension),
    );
    expect(fileName).toBe(newFileName + fileExtension);
  });

  test('TST5018 - Delete file [web,minio,electron]', async () => {
    // await createTxtFile();
    // await searchEngine('note'); //select new created file - note[date_created].txt
    const fileName = 'sample.html'; // await getGridFileName(-1);
    // expect(firstFileName).toBe('note.txt');

    // await expectElementExist(selectorFile, true);

    await deleteFileFromMenu(getGridFileSelector(fileName));
    await expectElementExist(getGridFileSelector(fileName), false, 2000);
    /* firstFileName = await getGridFileName(0);
    expect(firstFileName).toBe(undefined); */
  });

  test('TST5019 - Rename tag in file [web,minio,electron]', async () => {
    // await searchEngine('desktop');
    // Select file
    await clickOn(selectorFile);
    //Toggle Properties
    // await clickOn('[data-tid=fileContainerToggleProperties]');
    await AddRemoveTagsToSelectedFiles('grid', [testTagName], true);
    await expectElementExist(
      '[data-tid=tagContainer_' + testTagName + ']',
      true,
      8000,
      '[data-tid=perspectiveGridFileTable]',
    );
    // await expectTagsExistBySelector(selectorFile, [testTagName], true);

    /* await AddRemoveTagsToFile(perspectiveGridTable + firstFile, [testTagName], {
      add: true
    }); */
    await clickOn('[data-tid=tagMoreButton_' + testTagName + ']');
    await clickOn('[data-tid=editTagDialogMenu]');
    await global.client.dblclick('[data-tid=editTagEntryDialog_input] input');
    await setInputKeys('editTagEntryDialog_input', testTagName + 'Edited');
    await clickOn('[data-tid=confirmEditTagEntryDialog]');
    // await waitForNotification();

    //await expectTagsExistBySelector(selectorFile, [testTagName + 'Edited'],true);
    await expectElementExist(
      '[data-tid=tagContainer_' + testTagName + 'Edited]',
      true,
      8000,
      '[data-tid=perspectiveGridFileTable]',
    );
    await testDataRefresh();
    // cleanup
    /*await clickOn(selectorFile);
    await AddRemoveTagsToSelectedFiles('grid', [testTagName + 'Edited'], false);

    await expectElementExist(
      selectorFile + '[1]//div[@id="gridCellTags"]//button',
      false,
      5000
    );

    await expectTagsExistBySelector(
      selectorFile,
      [testTagName + 'Edited'],
      false
    );*/
  });

  test('TST5023 - Remove tag from file (tag menu) [web,minio,electron]', async () => {
    // await searchEngine('desktop');
    // select file
    await clickOn(selectorFile);
    //Toggle Properties
    //await clickOn('[data-tid=fileContainerToggleProperties]');
    await AddRemoveTagsToSelectedFiles('grid', [testTagName], true);
    await expectElementExist(
      '[data-tid=tagContainer_' + testTagName + ']',
      true,
      8000,
      '[data-tid=perspectiveGridFileTable]',
    );
    // await expectTagsExistBySelector(selectorFile, [testTagName], true);

    await removeTagFromTagMenu(testTagName);
    await expectElementExist(
      '[data-tid=tagContainer_' + testTagName + ']',
      false,
      8000,
      '[data-tid=perspectiveGridFileTable]',
    );
    // await expectTagsExistBySelector(selectorFile, [testTagName], false);
  });

  /**
   * todo search not work
   */
  test('TST5024 - Show files with a given tag (tag menu)', async () => {
    const selectedIds = await selectRowFiles([0, 1, 2]);
    await AddRemoveTagsToSelectedFiles('grid', [testTagName], true);
    await showFilesWithTag(testTagName);
    await clickOn('[data-tid=openDefaultPerspective]');

    const filesList = await global.client.$$(selectorFile);
    expect(filesList.length).toBe(selectedIds.length);

    /*const filesList = await global.client.$$(selectorFile);
    for (let i = 0; i < filesList.length; i++) {
      await expectTagsExist(filesList[i], [testTagName], true);
    }*/

    // cleanup
    await clickOn('#clearSearchID');
    await selectRowFiles([0, 1, 2]);
    await AddRemoveTagsToSelectedFiles('grid', [testTagName], false);
    await expectElementExist(
      '[data-tid=tagMoreButton_' + testTagName + ']',
      false,
      5000,
    );

    /* const classNotSelected = await getGridCellClass(0);
    const classSelected = await selectAllFiles(classNotSelected);
    expect(classNotSelected).not.toBe(classSelected);

    await AddRemoveTagsToSelectedFiles([testTagName], true);
    await showFilesWithTag(testTagName);

    const filesList = await global.client.$$(perspectiveGridTable + firstFile);
    for (let i = 0; i < filesList.length; i++) {
      await expectTagsExist(filesList[i], [testTagName], true);
    }

    // cleanup
    await selectAllFiles(classNotSelected);
    expect(classNotSelected).not.toBe(classSelected);
    await AddRemoveTagsToSelectedFiles([testTagName], false); */
  });

  test('TST5025 - Add - Remove tags (file menu) [web,minio,electron]', async () => {
    // await searchEngine('desktop');
    const fileName = 'sample';
    const fileExt = 'desktop';
    const tags = [testTagName, testTagName + '2'];
    // select file
    await clickOn(getGridFileSelector(fileName + '.' + fileExt));
    await AddRemoveTagsToSelectedFiles('grid', tags, true);

    let gridElement = await global.client.waitForSelector(
      getGridFileSelector(generateFileName(fileName, fileExt, tags, ' ')),
    );
    gridElement = await gridElement.$('..');
    for (let i = 0; i < tags.length; i++) {
      await expectElementExist('[data-tid=tagContainer_' + tags[i] + ']', true);
    }
    // await expectTagsExistBySelector(selectorFile, tags, true);

    // remove tags
    await gridElement.click();
    await AddRemoveTagsToSelectedFiles('grid', tags, false);
    for (let i = 0; i < tags.length; i++) {
      await expectElementExist(
        '[data-tid=tagContainer_' + tags[i] + ']',
        false,
      );
    }
    /*gridElement = await global.client.waitForSelector(
      getGridFileSelector(fileName + '.' + fileExt)
    );
    gridElement = await gridElement.$('..');*/
    // await expectTagsExist(gridElement, tags, false);
    // await expectTagsExistBySelector(selectorFile, tags, false);
  });

  test('TST5026 - Open file natively [electron]', async () => {
    if (!global.isMinio) {
      // Open file natively option is missing for Minio Location
      await searchEngine('txt');
      await openContextEntryMenu(selectorFile, 'fileMenuOpenFileNatively');
    }
    // check parent directory
  });

  test('TST5027 - Open containing folder [web,minio,electron]', async () => {
    if (!global.isMinio) {
      // Show in File Manager option is missing for Minio Location
      await searchEngine('txt');
      await openContextEntryMenu(selectorFile, 'fileMenuOpenContainingFolder');
    }
    // check parent directory
  });

  /* test('TST50** - Add / Remove tags', async () => {
    await searchEngine('txt');
    await openContextEntryMenu(
      perspectiveGridTable + firstFile,
      'fileMenuAddRemoveTags'
    );
    //TODO cannot find cancelTagsMultipleEntries ??
    await delay(500);
    const cancelButton = await global.client
        .$('[data-tid=cancelTagsMultipleEntries]');
    await cancelButton.waitForDisplayed();
    await cancelButton.click();
  }); */

  /**
   * todo web: io-actions.ts:120 Moving files failed with Renaming file failedSignatureDoesNotMatch
   */
  test('TST5028 - Move - Copy file (file menu) [minio,electron]', async () => {
    // Move file in child folder
    const fileName = 'sample.pdf';
    const folderName = 'empty_folder';
    const fileSelector = getGridFileSelector(fileName);
    await openContextEntryMenu(fileSelector, 'fileMenuMoveCopyFile');
    await clickOn('[data-tid=MoveTarget' + folderName + ']');

    await clickOn('[data-tid=confirmMoveFiles]');

    //await waitForNotification();
    await expectElementExist(getGridFileSelector(fileName), false);

    //await global.client.dblclick(selectorFolder);
    await openContextEntryMenu(
      getGridFileSelector(folderName),
      'openDirectory',
    );
    await expectElementExist(getGridFileSelector(fileName), true);

    // Copy file in parent directory
    await openContextEntryMenu(fileSelector, 'fileMenuMoveCopyFile');
    // await setInputKeys('targetPathInput', defaultLocationPath);
    //await clickOn('[data-tid=propsActionsMenuTID]');
    await clickOn('[data-tid=navigateToParentTID]');
    await clickOn('[data-tid=confirmCopyFiles]');
    await clickOn('[data-tid=uploadCloseAndClearTID]');

    await clickOn('[data-tid=gridPerspectiveOnBackButton]');
    await expectElementExist(getGridFileSelector(fileName), true);

    // cleanup
    // await global.client.dblclick(selectorFolder);
    await openContextEntryMenu(
      getGridFileSelector(folderName),
      'openDirectory',
    );
    await expectElementExist(selectorFile, true);
    await deleteFileFromMenu();
    await expectElementExist(selectorFile, false);
    await reloadDirectory();
    await expectElementExist(selectorFile, false);
  });

  test.skip('TST5029 - Add file from file manager with dnd [manual]', async () => {});

  test('TST5033 - Open directory (directory menu) [web,minio,electron]', async () => {
    // open empty_folder
    await openContextEntryMenu(selectorFolder, 'openDirectory');
    // await global.client.screenshot({ path: 'screenshotTST5033.png' });
    await expectElementExist(selectorFile, false);
    // const firstFileName = await getGridFileName(0);
    // expect(firstFileName).toBe(undefined); //'sample.eml');
  });

  test('TST5034 - Rename directory (directory menu) [web,minio,electron]', async () => {
    const newDirName = 'new_dir_name';
    await openContextEntryMenu(selectorFolder, 'renameDirectory');
    const oldDirName = await setInputKeys('renameEntryDialogInput', newDirName);
    await clickOn('[data-tid=confirmRenameEntry]');

    // turn dir name back
    await openContextEntryMenu(selectorFolder, 'renameDirectory');
    const renamedDir = await setInputKeys('renameEntryDialogInput', oldDirName);
    await clickOn('[data-tid=confirmRenameEntry]');
    expect(renamedDir).toBe(newDirName);
  });

  /**
   * delete dir is not supported on minio
   */
  test('TST5035 - Delete directory (directory menu) [web,minio,electron]', async () => {
    // await setSettings('[data-tid=settingsSetUseTrashCan]');
    // await global.client.pause(500);
    await global.client.dblclick(selectorFolder);
    const testFolder = await createNewDirectory('aaa');

    await openContextEntryMenu(selectorFolder, 'deleteDirectory');
    await clickOn('[data-tid=confirmDeleteFileDialog]');

    await expectElementExist(
      '[data-tid=fsEntryName_' + testFolder + ']',
      false,
    );
    // dir back to check if parent folder exist
    // await clickOn('[data-tid=gridPerspectiveOnBackButton]');
    // await expectElementExist(selectorFolder, true);
  });

  test('TST5036 - Open directory properties (directory menu) [web,minio,electron]', async () => {
    await openContextEntryMenu(selectorFolder, 'showProperties');
    await expectElementExist('[data-tid=fileNameProperties]', true, 5000);
  });

  test('TST5037 - Show sub folders [web,minio,electron]', async () => {
    // click on hide directories
    await setGridOptions('grid', false);

    // file
    await expectElementExist(selectorFile, true);
    // folder
    await expectElementExist(selectorFolder, false);

    // show sub folder in the grid perspective
    await setGridOptions('grid', true);

    // file
    await expectElementExist(selectorFile, true);
    // folder
    await expectElementExist(selectorFolder, true);
  });

  test.skip('TST5038 - Return directory back [web,minio,electron]', async () => {
    // TODO
    // expect(received).toBe(expected) // Object.is equality
    // Expected: true
    // Received: false
    //   363 | ) {
    //   364 |   const displayed = await isDisplayed(selector, exist, timeout);
    // > 365 |   expect(displayed).toBe(true);
    //       |                     ^
    //   366 |   // return element;
    //   367 | }
    //   368 |
    //   at expectElementExist (e2e/general.helpers.js:365:21)
    //   at Object.<anonymous> (e2e/perspective-grid-right-button.pw.e2e.js:421:5)
    // await expectElementExist(selectorFolder);

    // Open folder
    await global.client.dblclick(selectorFolder);
    // await global.client.screenshot({ path: 'screenshotTST5038.png' });
    await expectElementExist(selectorFolder, false);
    await clickOn('[data-tid=gridPerspectiveOnBackButton]');
    await expectElementExist(selectorFolder);
  });

  test('TST5039 - Changing the Perspective View [web,minio,electron]', async () => {
    // await isDisplayed('[data-tid=perspectiveGridFileTable]', true);
    // await global.client.screenshot({ path: 'screenshotTST5039.png' });

    // const grid = await global.client.waitForSelector(
    //   '[data-tid=perspectiveGridFileTable]'
    // );
    // let gridStyle = await grid.getAttribute('style');
    // expect(gridStyle).toContain(
    //   'margin-top: 53px; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));'
    // );
    // await clickOn('[data-tid=openListPerspective]');
    // // check perspective view
    // gridStyle = await grid.getAttribute('style');
    // expect(gridStyle).toContain('grid-template-columns: none;');

    await expectElementExist(
      // '[data-tid=' + gridDefaultSettings.testID + ']',
      '[data-tid=gridPerspectiveContainer]',
      true,
      5000,
    );
    await clickOn('[data-tid=openListPerspective]'); // openListPerspective
    await expectElementExist(
      // '[data-tid=' + listDefaultSettings.testID + ']',
      '[data-tid=listPerspectiveContainer]',
      true,
    );
  });

  test('TST5040 - Create file [web,minio,electron]', async () => {
    // Open empty folder
    await global.client.dblclick(selectorFolder);

    await createTxtFile();
    // await searchEngine('note');
    await expectElementExist(selectorFile, true, 5000);

    // cleanup
    // await deleteFirstFile();
    // const firstFileName = await getGridFileName(0);
    // expect(firstFileName).toBe(undefined);
  });
});
