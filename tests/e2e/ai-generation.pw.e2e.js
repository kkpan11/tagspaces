/* Copyright (c) 2016-present - TagSpaces GmbH. All rights reserved. */

// AI generation dialog coverage. Two tiers:
//
//  Tier 1 — guard / UI-state, no AI service needed (deterministic):
//    TST7001  no AI provider configured -> Start disabled + warning + CTA
//    TST7002  only unsupported files selected -> Start disabled; selecting a
//             supported file re-enables it
//    TST7003  "Max tags" cannot be set to 0 (clamps to >=1)
//
//  Tier 2 — generation flow against a mocked LLM (Playwright route):
//    TST7004  Ollama-native: tags generated -> file renamed by tag embedding
//             -> the per-file "processed" check stays visible (regression:
//             entry uuid churns on the tag-rename, the dialog must not lose it)
//    TST7005  OpenAI-compatible (LM Studio/llama.cpp): tags generated via
//             /v1/chat/completions; asserts the request adapter emitted
//             OpenAI-shaped messages + response_format.json_schema
//    TST7006  Settings → AI add-engine menu offers all presets; picking
//             LM Studio fills the OpenAI base URL :1234/v1 (UI only, no net)
//
// All AI features are Pro and don't apply to S3 — tagged [electron,_pro].

import { expect, test } from './fixtures';
import {
  clickOn,
  createLocation,
  expectElementExist,
  expectElementSelected,
  getGridFileSelector,
  isDisabled,
  reloadDirectory,
} from './general.helpers';
import { startTestingApp, stopApp, testDataRefresh } from './hook';
import { clearDataStorage, closeWelcomePlaywright } from './welcome.helpers';
import {
  armOllamaMock,
  armOpenAIMock,
  disarmOllamaMock,
  disarmOpenAIMock,
  openAiGenerationDialog,
} from './ai.helpers';

async function bootWithLocation(
  { isWeb, isS3, webServerPort, testInfo },
  testDataDir,
  extconfig,
) {
  await startTestingApp({ isWeb, isS3, webServerPort, testInfo }, extconfig);
  await closeWelcomePlaywright();
  // Use the suite's blessed helper — it opens the location and waits for the
  // directory grid (not the location-tree) to be populated.
  await createLocation({ isS3, testDataDir }, '', undefined, true);
  // Make sure the files we interact with are actually listed before clicking,
  // so selection isn't racing the directory render.
  await expectElementExist(getGridFileSelector('sample.txt'), true, 30000);
}

async function selectFile(name) {
  await expectElementExist(getGridFileSelector(name), true, 15000);
  await clickOn(getGridFileSelector(name));
  // Selection can lag a beat behind the click under full-suite load.
  await expectElementSelected(name, true, 10000);
}

test.describe('TST70 - AI generation dialog guards [electron,_pro]', () => {
  test.afterEach(async ({ isS3, testDataDir }) => {
    await testDataRefresh(isS3, testDataDir);
    await clearDataStorage();
    await stopApp();
  });

  test('TST7001 - No AI provider: Start disabled, warning + settings CTA [electron,_pro]', async ({
    isWeb,
    isS3,
    webServerPort,
    testDataDir,
  }, testInfo) => {
    await bootWithLocation(
      { isWeb, isS3, webServerPort, testInfo },
      testDataDir,
      'extconfig-ai-no-provider.js',
    );
    // A supported file is selected so the only reason generation can't
    // start is the missing provider.
    await selectFile('sample.txt');
    await openAiGenerationDialog();

    await expectElementExist('[data-tid=aiCannotGenerateAlertTID]', true, 4000);
    // The "open AI settings" action only renders when there is no provider —
    // this distinguishes the no-provider case from no-supported-files.
    await expectElementExist(
      '[data-tid=openAiSettingsFromAlertTID]',
      true,
      4000,
    );
    expect(await isDisabled('[data-tid=startTagsGenTID]')).toBe(true);
  });

  test('TST7003 - Max tags cannot be 0 (clamps to >=1) [electron,_pro]', async ({
    isWeb,
    isS3,
    webServerPort,
    testDataDir,
  }, testInfo) => {
    await bootWithLocation(
      { isWeb, isS3, webServerPort, testInfo },
      testDataDir,
      'extconfig-ai-mock.js',
    );
    await selectFile('sample.txt');
    await openAiGenerationDialog();

    const maxTags = '[data-tid=maxTagsTID] input';
    await global.client.fill(maxTags, '0');
    // onChange clamps non-positive/NaN to 1; the controlled input reflects it.
    await expect
      .poll(() => global.client.inputValue(maxTags), {
        timeout: 4000,
        intervals: [150],
      })
      .toBe('1');
  });
});

test.describe('TST70 - AI generation: supported-files guard [electron,_pro]', () => {
  test.afterEach(async ({ isS3, testDataDir }) => {
    await testDataRefresh(isS3, testDataDir);
    await clearDataStorage();
    await stopApp();
  });

  test('TST7002 - Only unsupported selected disables Start; supported re-enables [electron,_pro]', async ({
    isWeb,
    isS3,
    webServerPort,
    testDataDir,
  }, testInfo) => {
    await bootWithLocation(
      { isWeb, isS3, webServerPort, testInfo },
      testDataDir,
      'extconfig-ai-mock.js',
    );

    // sample.bmp is neither an AI-supported text nor image type.
    await selectFile('sample.bmp');
    await openAiGenerationDialog();
    await expectElementExist('[data-tid=aiCannotGenerateAlertTID]', true, 4000);
    // Provider IS configured here, so the no-provider CTA must NOT show —
    // the block is purely the unsupported-selection guard.
    await expectElementExist(
      '[data-tid=openAiSettingsFromAlertTID]',
      false,
      2000,
    );
    expect(await isDisabled('[data-tid=startTagsGenTID]')).toBe(true);

    // Close, select a supported file, reopen -> Start enabled, no warning.
    await clickOn('[data-tid=cancelTagsGenTID]');
    await selectFile('sample.txt');
    await openAiGenerationDialog();
    await expectElementExist('[data-tid=aiCannotGenerateAlertTID]', false, 2000);
    expect(await isDisabled('[data-tid=startTagsGenTID]')).toBe(false);
  });
});

test.describe('TST70 - AI generation: mocked OpenAI-compatible [electron,_pro]', () => {
  test.afterEach(async ({ isS3, testDataDir }) => {
    await testDataRefresh(isS3, testDataDir);
    await clearDataStorage();
    await stopApp();
  });

  test('TST7005 - OpenAI-compatible: tags generated via /v1, response_format adapter [electron,_pro]', async ({
    isWeb,
    isS3,
    webServerPort,
    testDataDir,
  }, testInfo) => {
    // Same end-to-end flow as TST7004 but against the generic OpenAI-compatible
    // client (LM Studio / llama.cpp): the model list comes from GET /v1/models
    // and generation from POST /v1/chat/completions. This exercises the engine
    // dispatch + the request adapter that Ollama's native path never touches.
    await bootWithLocation(
      { isWeb, isS3, webServerPort, testInfo },
      testDataDir,
      'extconfig-ai-mock-openai.js',
    );

    const capture = {
      models: 0,
      chat: 0,
      requests: [],
      lastChatBody: null,
    };
    await armOpenAIMock(capture, ['e2ealpha', 'e2ebeta', 'e2egamma']);
    try {
      await selectFile('sample.txt');
      await openAiGenerationDialog();
      await clickOn('[data-tid=startTagsGenTID]');

      // Mock exercised: model list (/v1/models) + at least one chat call.
      await expect
        .poll(() => capture.chat, { timeout: 30000, intervals: [300] })
        .toBeGreaterThan(0);
      expect(capture.models).toBeGreaterThan(0);

      // The renderer hit the OpenAI endpoints, not Ollama's /api/*.
      expect(
        capture.requests.some((r) => r.includes('/v1/chat/completions')),
      ).toBe(true);
      expect(capture.requests.every((r) => !r.includes('/api/chat'))).toBe(true);

      // The adapter translated the internal request: OpenAI-shaped messages and
      // the tags-mode JSON schema surfaced as response_format.json_schema.
      expect(Array.isArray(capture.lastChatBody?.messages)).toBe(true);
      expect(capture.lastChatBody?.response_format?.type).toBe('json_schema');
      const sentSchema =
        capture.lastChatBody?.response_format?.json_schema?.schema;
      expect(sentSchema).toBeTruthy();

      // The schema must be sanitized before it reaches an OpenAI-compatible
      // server: zodToJsonSchema emits a `$schema` declaration and `$defs`/`$ref`
      // indirection that LM Studio / llama.cpp reject with HTTP 400. Assert no
      // such keyword survives anywhere in the sent schema tree.
      const schemaJson = JSON.stringify(sentSchema);
      expect(schemaJson).not.toContain('$schema');
      expect(schemaJson).not.toContain('$ref');
      expect(schemaJson).not.toContain('$defs');
      expect(schemaJson).not.toContain('definitions');

      // Wait for the per-file processed check so the tag-apply + rename has
      // actually landed before we close and read the on-disk state.
      await expectElementExist('[data-tid=aiEntryProcessedTID]', true, 40000);

      // Tags applied -> file renamed by tag embedding (same assertion as 7004).
      await clickOn('[data-tid=cancelTagsGenTID]');
      await reloadDirectory();
      await expectElementExist(
        getGridFileSelector('sample[e2ealpha e2ebeta e2egamma].txt'),
        true,
        15000,
      );
      await expectElementExist(getGridFileSelector('sample.txt'), false, 3000);
    } finally {
      await disarmOpenAIMock();
    }
  });
});

test.describe('TST70 - AI settings: OpenAI-compatible presets [electron,_pro]', () => {
  test.afterEach(async ({ isS3, testDataDir }) => {
    await testDataRefresh(isS3, testDataDir);
    await clearDataStorage();
    await stopApp();
  });

  test('TST7006 - Add-engine menu offers presets; LM Studio fills :1234/v1 [electron,_pro]', async ({
    isWeb,
    isS3,
    webServerPort,
    testDataDir,
  }, testInfo) => {
    // Booted WITHOUT ExtAI so the provider-editing UI is enabled (see
    // extconfig-ai-ui.js). Pure UI/redux assertion — no network — covering the
    // presets table and the per-preset default-URL logic.
    await bootWithLocation(
      { isWeb, isS3, webServerPort, testInfo },
      testDataDir,
      'extconfig-ai-ui.js',
    );

    await clickOn('[data-tid=settings]');
    await clickOn('[data-tid=aiSettingsDialogTID]');
    await global.client.waitForSelector('[data-tid=createNewAIButtonTID]', {
      state: 'visible',
      timeout: 10000,
    });

    // Open the add-engine menu and confirm every preset is offered.
    await clickOn('[data-tid=createNewAIButtonTID]');
    await expectElementExist('[data-tid=aiAddProvider_ollamaTID]', true, 5000);
    await expectElementExist('[data-tid=aiAddProvider_lmstudioTID]', true, 3000);
    await expectElementExist('[data-tid=aiAddProvider_llamacppTID]', true, 3000);
    await expectElementExist(
      '[data-tid=aiAddProvider_openai-compatibleTID]',
      true,
      3000,
    );

    // Pick LM Studio -> a provider accordion appears, pre-filled with the
    // OpenAI base URL and the preset label.
    await clickOn('[data-tid=aiAddProvider_lmstudioTID]');
    await expect
      .poll(() => global.client.inputValue('[data-tid=ollamaEngineTID] input'), {
        timeout: 8000,
        intervals: [200],
      })
      .toBe('http://localhost:1234/v1');
    expect(
      await global.client.inputValue('[data-tid=engineTID] input'),
    ).toBe('LM Studio');
  });
});

test.describe('TST70 - AI generation: mocked Ollama [electron,_pro]', () => {
  test.afterEach(async ({ isS3, testDataDir }) => {
    await testDataRefresh(isS3, testDataDir);
    await clearDataStorage();
    await stopApp();
  });

  test('TST7004 - Tags generated, file renamed, processed check persists [electron,_pro]', async ({
    isWeb,
    isS3,
    webServerPort,
    testDataDir,
  }, testInfo) => {
    await bootWithLocation(
      { isWeb, isS3, webServerPort, testInfo },
      testDataDir,
      'extconfig-ai-mock.js',
    );

    const capture = { tags: 0, chat: 0, requests: [] };
    await armOllamaMock(capture, ['e2ealpha', 'e2ebeta', 'e2egamma']);
    try {
      await selectFile('sample.txt');
      await openAiGenerationDialog();
      await clickOn('[data-tid=startTagsGenTID]');

      // Mock was actually exercised (model list + at least one chat call).
      await expect
        .poll(() => capture.chat, { timeout: 30000, intervals: [300] })
        .toBeGreaterThan(0);

      // The per-file processed check appears…
      await expectElementExist('[data-tid=aiEntryProcessedTID]', true, 40000);
      // …and it must STILL be there after the tag-rename has reflected.
      // This is the regression: pre-fix the renamed entry got a fresh uuid
      // (files without a sidecar are re-enhanced with getUuid() on every
      // listing) and the frozen-snapshot was swapped out, losing the check.
      await global.client.waitForTimeout(4000);
      await expectElementExist('[data-tid=aiEntryProcessedTID]', true, 3000);

      // Close the dialog before checking the grid: with the modal open the
      // grid sits behind the backdrop (reflect timing + visibility are
      // racy). Closing + an explicit reload reads the on-disk state, which
      // is the source of truth — the rename already completed on disk by
      // the time the processed check appeared.
      await clickOn('[data-tid=cancelTagsGenTID]');
      await reloadDirectory();
      await expectElementExist(
        getGridFileSelector('sample[e2ealpha e2ebeta e2egamma].txt'),
        true,
        15000,
      );
      await expectElementExist(getGridFileSelector('sample.txt'), false, 3000);
    } finally {
      await disarmOllamaMock();
    }
  });
});
