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
  createNewDirectory,
  openFolder,
  deleteDirectory,
  closeOpenedFile,
  clickOn,
  expectElementExist,
  expectFileContain,
  getGridFileSelector,
  setInputValue,
  waitForNotification,
} from './general.helpers';
import { startTestingApp, stopApp } from './hook';
import { clearDataStorage, closeWelcomePlaywright } from './welcome.helpers';
import { clickOnMenuOperation } from './test-utils';

const testFolder = 'templateTestFolder';

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

test.afterEach(async () => {
  await clearDataStorage();
});

test.beforeEach(async ({ isS3, testDataDir }) => {
  if (isS3) {
    await closeWelcomePlaywright();
    await createS3Location('', defaultLocationName, true);
  } else {
    await createPwLocation(testDataDir, defaultLocationName, true);
  }
  await clickOn('[data-tid=location_' + defaultLocationName + ']');
  await expectElementExist(getGridFileSelector('empty_folder'), true, 15000);
});

/**
 * Opens the "Create new file from template" dialog (tile grid phase).
 * Assumes a folder is already open in the grid perspective.
 */
async function openTemplateGrid() {
  await clickOn('[data-tid=folderContainerOpenDirMenu]');
  await clickOnMenuOperation('createNewFromTemplateTID');
  await expectElementExist('[data-tid=newFileDialog]', true, 5000);
}

/**
 * Opens the templates management view (Settings -> Templates) and waits for the
 * default Markdown template accordion to be present.
 */
async function openManageTemplates() {
  await clickOn('[data-tid=settings]');
  await clickOn('[data-tid=templatesDialogTID]');
  await expectElementExist('[data-tid=templateMdTemplateTID]', true, 5000);
}

test.describe('TST74 - File templates', () => {
  test('TST7401 - Create file by picking a template tile [electron,_pro]', async () => {
    await createNewDirectory(testFolder);
    await openFolder(testFolder);

    await openTemplateGrid();

    // The tile grid is shown with a tile per template ...
    await expectElementExist(
      '[data-tid=newFileTemplateTile_templateMd]',
      true,
      5000,
    );
    // ... and the old per-tile "Use this template" button is gone (redesign).
    await expectElementExist('[data-tid=createMarkdownButton]', false, 2000);
    // At this stage there is no editable form / OK button yet.
    await expectElementExist('[data-tid=newEntryDialogInputTID]', false, 2000);

    // Clicking a tile loads the template into the editable form.
    await clickOn('[data-tid=newFileTemplateTile_templateMd]');
    await expectElementExist('[data-tid=newEntryDialogInputTID]', true, 5000);

    // The name field is prefilled from the template.
    const prefilledName = await global.client
      .locator('[data-tid=newEntryDialogInputTID] input')
      .inputValue();
    expect(prefilledName.length).toBeGreaterThan(0);

    // Edit the (now editable) title + content before creating.
    await setInputValue(
      '[data-tid=newEntryDialogInputTID] input',
      'templatetest',
    );
    await setInputValue('#fileContentID', 'TEMPLATEBODY123');

    await clickOn('[data-tid=createTID]');
    await waitForNotification();

    // The created file contains the edited content and uses the edited name.
    await expectFileContain('TEMPLATEBODY123', 10000);
    await closeOpenedFile();
    await expectElementExist(
      getGridFileSelector('templatetest.md'),
      true,
      10000,
    );

    await deleteDirectory(testFolder);
  });

  test('TST7402 - Back navigates from the editable form to the tile grid [electron,_pro]', async () => {
    await createNewDirectory(testFolder);
    await openFolder(testFolder);

    await openTemplateGrid();
    await clickOn('[data-tid=newFileTemplateTile_templateMd]');
    // Editable form is shown.
    await expectElementExist('[data-tid=newEntryDialogInputTID]', true, 5000);

    // Going back returns to the tile grid ...
    await clickOn('[data-tid=backToTemplatesTID]');
    await expectElementExist(
      '[data-tid=newFileTemplateTile_templateMd]',
      true,
      5000,
    );
    // ... and the editable form is hidden again.
    await expectElementExist('[data-tid=newEntryDialogInputTID]', false, 2000);

    await clickOn('[data-tid=closeNewFileDialogTID]');
    await deleteDirectory(testFolder);
  });

  test('TST7403 - Changing the template via the dropdown reloads the editable content [electron,_pro]', async () => {
    await createNewDirectory(testFolder);
    await openFolder(testFolder);

    await openTemplateGrid();
    // Start from the plain Markdown template.
    await clickOn('[data-tid=newFileTemplateTile_templateMd]');
    await expectElementExist('[data-tid=newEntryDialogInputTID]', true, 5000);

    // Switch to the "Idea" template via the in-form dropdown. The dropdown tid
    // is reused by the Settings dialog, so scope it to the new-file dialog.
    await clickOn(
      '[data-tid=newFileDialog] [data-tid=tagDelimiterTID] [role="combobox"]',
    );
    await clickOn('[data-tid=templateOption_templateIdea]');

    // The editable content + title update to reflect the newly chosen template.
    await expect
      .poll(
        async () =>
          global.client.locator('#fileContentID').inputValue(),
        { timeout: 5000, message: 'content should switch to the Idea template' },
      )
      .toContain('Idea');

    const nameAfter = await global.client
      .locator('[data-tid=newEntryDialogInputTID] input')
      .inputValue();
    expect(nameAfter).toContain('idea');

    await clickOn('[data-tid=closeNewFileDialogTID]');
    await deleteDirectory(testFolder);
  });

  test('TST7410 - Manage templates: add and reset reflects in the create dialog [electron,_pro]', async () => {
    await createNewDirectory(testFolder);
    await openFolder(testFolder);

    // Baseline: number of template tiles in the create-from-template grid.
    // The tile prefix is unique to templates, so counting tiles is the most
    // reliable way to track how many templates exist.
    const tilesSelector = '[data-tid^="newFileTemplateTile_"]';
    await openTemplateGrid();
    await expectElementExist(
      '[data-tid=newFileTemplateTile_templateMd]',
      true,
      5000,
    );
    const baseTiles = await global.client.locator(tilesSelector).count();
    expect(baseTiles).toBeGreaterThan(0);
    await clickOn('[data-tid=closeNewFileDialogTID]');

    // Open the templates management (Settings -> Templates) and add one.
    await clickOn('[data-tid=settings]');
    await clickOn('[data-tid=templatesDialogTID]');
    await expectElementExist('[data-tid=templateMdTemplateTID]', true, 5000);
    await clickOn('[data-tid=addTemplateTID]');
    await clickOn('[data-tid=saveTemplateTID]');
    await clickOn('[data-tid=closeSettingsDialog]');

    // The newly added template shows up as an extra tile in the create dialog.
    await openTemplateGrid();
    await expect
      .poll(async () => global.client.locator(tilesSelector).count(), {
        timeout: 5000,
        message: 'the added template should appear as a new tile',
      })
      .toBe(baseTiles + 1);
    await clickOn('[data-tid=closeNewFileDialogTID]');

    // Reset templates back to the defaults (also restores clean state).
    await clickOn('[data-tid=settings]');
    await clickOn('[data-tid=templatesDialogTID]');
    await clickOn('[data-tid=resetTemplatesTID]');
    await clickOn('[data-tid=closeSettingsDialog]');

    await openTemplateGrid();
    await expect
      .poll(async () => global.client.locator(tilesSelector).count(), {
        timeout: 5000,
        message: 'reset should restore the default template count',
      })
      .toBe(baseTiles);
    await clickOn('[data-tid=closeNewFileDialogTID]');

    await deleteDirectory(testFolder);
  });

  test('TST7411 - Manage templates: editing a template (incl. description) persists [electron,_pro]', async () => {
    // The name field is single-line (input); content/description are multiline
    // (textarea). MUI renders a hidden shadow textarea for autosize, so target
    // the real one explicitly.
    const nameSelector = '[data-tid=templateName_templateMdTID] input';
    const descSelector =
      '[data-tid=templateDescription_templateMdTID] textarea:not([aria-hidden="true"])';
    const newName = 'Edited Markdown';
    const newDescription = 'Edited template description for e2e';

    // Open Settings -> Templates and expand the Markdown template. Click the
    // expand icon specifically — the summary center can land on the remove
    // button (which stops propagation and would fire a delete confirm).
    await openManageTemplates();
    await clickOn(
      '[data-tid=templateMdTemplateTID] .MuiAccordionSummary-expandIconWrapper',
    );
    await global.client
      .locator(descSelector)
      .waitFor({ state: 'visible', timeout: 5000 });

    // Edit the name + description and save.
    await setInputValue(nameSelector, newName);
    await setInputValue(descSelector, newDescription);
    await clickOn('[data-tid=saveTemplateTID]');
    await clickOn('[data-tid=closeSettingsDialog]');

    // Reopen, expand again and assert both edits persisted.
    await openManageTemplates();
    await clickOn(
      '[data-tid=templateMdTemplateTID] .MuiAccordionSummary-expandIconWrapper',
    );
    await global.client
      .locator(descSelector)
      .waitFor({ state: 'visible', timeout: 5000 });
    await expect
      .poll(async () => global.client.locator(nameSelector).inputValue(), {
        timeout: 5000,
        message: 'edited template name should persist',
      })
      .toBe(newName);
    await expect
      .poll(async () => global.client.locator(descSelector).inputValue(), {
        timeout: 5000,
        message: 'edited template description should persist',
      })
      .toBe(newDescription);

    // Restore defaults to keep state clean for following tests.
    await clickOn('[data-tid=resetTemplatesTID]');
    await clickOn('[data-tid=closeSettingsDialog]');
  });

  test('TST7412 - Manage templates: deleting a template removes it [electron,_pro]', async () => {
    // The plain-text template exists by default.
    await openManageTemplates();
    await expectElementExist('[data-tid=templateTxtTemplateTID]', true, 5000);

    // The remove button triggers a native confirm() dialog — accept it.
    global.client.once('dialog', (dialog) => dialog.accept());
    await clickOn('[data-tid=removeTemplate_templateTxtTID]');

    // The template accordion disappears.
    await expectElementExist('[data-tid=templateTxtTemplateTID]', false, 5000);
    await clickOn('[data-tid=closeSettingsDialog]');

    // It also disappears from the create-from-template tile grid.
    await createNewDirectory(testFolder);
    await openFolder(testFolder);
    await openTemplateGrid();
    await expectElementExist(
      '[data-tid=newFileTemplateTile_templateTxt]',
      false,
      2000,
    );
    await clickOn('[data-tid=closeNewFileDialogTID]');

    // Restore defaults for the following tests.
    await openManageTemplates();
    await clickOn('[data-tid=resetTemplatesTID]');
    await clickOn('[data-tid=closeSettingsDialog]');

    await deleteDirectory(testFolder);
  });
});
