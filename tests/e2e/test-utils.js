/* Copyright (c) 2016-present - TagSpaces GmbH. All rights reserved. */
import { expect } from '@playwright/test';
import { clickOn, expectElementExist } from './general.helpers';

const newDirectoryName = 'newDirectory';
export const perspectiveGridTable = '//*[@data-tid="perspectiveGridFileTable"]';
export const firstFile = '/span';
export const firstFolder = '/div';
export const firstFileName = '/span/div/div/div/p';

// Menu entries that were moved into hover-opened submenus (FileMenu "Open ▸"
// and the directory menu "New ▸"). Maps a leaf menu-item TID to the parent
// submenu trigger that must be opened before the leaf becomes visible.
const submenuParentTid = {
  fileMenuOpenFile: 'fileMenuOpen',
  fileMenuOpenParentFolderInternally: 'fileMenuOpen',
  fileMenuOpenFileNatively: 'fileMenuOpen',
  createNewTextFileTID: 'createNewSubmenuTID',
  createNewMarkdownFileTID: 'createNewSubmenuTID',
  createHTMLTextFileTID: 'createNewSubmenuTID',
  createNewLinkFileTID: 'createNewSubmenuTID',
  createNewFromTemplateTID: 'createNewSubmenuTID',
  createNewAudioTID: 'createNewSubmenuTID',
  newSubDirectory: 'createNewSubmenuTID',
  addExistingFile: 'createNewSubmenuTID',
  newFromDownloadURLTID: 'createNewSubmenuTID',
};

// Resolve the parent submenu trigger for a menu operation, if it lives in a
// submenu. "Open with extension" entries use a dynamic `openWith-*` TID.
function getSubmenuParentTid(menuOperation) {
  if (submenuParentTid[menuOperation]) {
    return submenuParentTid[menuOperation];
  }
  return menuOperation.startsWith('openWith-') ? 'fileMenuOpen' : undefined;
}

// Click a menu operation in an already-open menu, opening its parent submenu
// first when the entry has been nested into one.
export async function clickOnMenuOperation(menuOperation) {
  const parentTid = getSubmenuParentTid(menuOperation);
  if (parentTid) {
    const parentSelector = '[data-tid=' + parentTid + ']';
    await global.client.waitForSelector(parentSelector, {
      state: 'visible',
      timeout: 5000,
    });
    await clickOn(parentSelector);
  }
  const menuSelector = '[data-tid=' + menuOperation + ']';
  await global.client.waitForSelector(menuSelector, {
    state: 'visible',
    timeout: 5000,
  });
  await clickOn(menuSelector);
}

export async function openContextEntryMenu(selector, menuOperation) {
  // selector is current selector location for element in perspectiveGridTable or perspectiveListTable (full xpath path to element)
  // menuOption is selector for current menu operation
  await clickOn(selector, { button: 'right' });
  await clickOnMenuOperation(menuOperation);
}

/**
 * @deprecated use getGridFileName(fileIndex) instead
 * @param filename
 * @param selector
 * @returns {Promise<void>}
 */
export async function checkFilenameForExist(filename, selector) {
  // selector is current selector location for element in perspectiveGridTable or perspectiveListTable (full xpath path to element)

  const file = await global.client.$(
    selector || perspectiveGridTable + firstFileName,
  );
  const fileTxt = await file.getText();
  expect(fileTxt).toBe(filename);
}

export function toContainTID(text, tids = ['etete&5435']) {
  return tids.every((tid) => text.indexOf(tid) !== -1);
}

export async function renameFolder() {
  await clickOn('[data-tid=folderContainerOpenDirMenu]');
  await clickOn('[data-tid=renameDirectory]');
  // set new dir name
  const input = await global.client.locator(`[data-tid='renameEntryDialogInput'] input`);
  await input.fill(newDirectoryName)

  await clickOn('[data-tid=confirmRenameEntry]');
  await expectElementExist(
    '[data-tid=currentDir_' + newDirectoryName + ']',
    true,
    5000,
  );
  return newDirectoryName;
}
