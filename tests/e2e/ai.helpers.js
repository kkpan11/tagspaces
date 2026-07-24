/* Copyright (c) 2016-present - TagSpaces GmbH. All rights reserved. */

/**
 * Reusable Ollama HTTP mock for the AI generation e2e tests.
 *
 * The renderer talks to Ollama from the browser context via `ollama/browser`
 * (plain `fetch`): model listing hits `GET {host}/api/tags`, generation hits
 * `POST {host}/api/chat`. We intercept the configured mock host with Playwright
 * route() — same approach as update-check.pw.e2e.js — so the suite never needs
 * a real Ollama service and stays deterministic in CI.
 *
 * The mock host MUST match `url` in scripts/extconfig-ai-mock.js.
 */

const OLLAMA_HOST_PATTERN = '**/127.0.0.1:11434/**';

// The ollama lib sends `Content-Type: application/json`, which makes the
// cross-origin fetch non-simple → the browser fires a CORS preflight. Fulfil
// it (and tag every response with permissive CORS headers) or the real
// request never goes out and the route handler is never reached.
const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,OPTIONS',
  'access-control-allow-headers': '*',
};

function mockModel(name) {
  return {
    name,
    model: name,
    modified_at: new Date().toISOString(),
    size: 1,
    digest: 'e2e-mock-digest',
    details: {
      parent_model: '',
      format: 'gguf',
      family: 'llama',
      families: ['llama'],
      parameter_size: '1B',
      quantization_level: 'Q4_0',
    },
  };
}

function chatResponse(content) {
  return {
    model: 'llama3.2:latest',
    created_at: new Date().toISOString(),
    message: { role: 'assistant', content },
    done: true,
    done_reason: 'stop',
    total_duration: 1,
    load_duration: 1,
    prompt_eval_count: 1,
    prompt_eval_duration: 1,
    eval_count: 1,
    eval_duration: 1,
  };
}

/**
 * Arm the Ollama interceptor.
 *
 * @param capture mutable bucket — { tags, chat, requests } — updated in place
 *        so a test can assert how many calls the app actually made.
 * @param tags    the tag titles the mocked `/api/chat` returns (the renderer
 *        parses the assistant content as JSON and reads `.topics`).
 */
export async function armOllamaMock(
  capture = { tags: 0, chat: 0, requests: [] },
  tags = ['e2ealpha', 'e2ebeta', 'e2egamma'],
) {
  await global.client.route(OLLAMA_HOST_PATTERN, async (route) => {
    const request = route.request();
    const url = request.url();
    const method = request.method();
    capture.requests.push(method + ' ' + url);

    if (method === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: CORS_HEADERS, body: '' });
      return;
    }
    if (url.includes('/api/tags')) {
      capture.tags += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: CORS_HEADERS,
        body: JSON.stringify({
          models: [mockModel('llama3.2:latest'), mockModel('llava:latest')],
        }),
      });
      return;
    }
    if (url.includes('/api/chat')) {
      capture.chat += 1;
      // Tags mode parses the content as JSON and reads `.topics`. Returning
      // this for the model warm-up call too is harmless (that path ignores
      // the content).
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: CORS_HEADERS,
        body: JSON.stringify(chatResponse(JSON.stringify({ topics: tags }))),
      });
      return;
    }
    // Anything else the lib might probe — keep it 200 so nothing throws.
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: CORS_HEADERS,
      body: '{}',
    });
  });
  return capture;
}

export async function disarmOllamaMock() {
  await global.client.unroute(OLLAMA_HOST_PATTERN);
}

/* ------------------------------------------------------------------ *
 * OpenAI-compatible mock (LM Studio / llama.cpp / vLLM / OpenAI)
 *
 * The renderer's generic client (src/renderer/components/chat/OpenAIClient.ts)
 * talks plain OpenAI HTTP from the browser context: model listing hits
 * `GET {base}/models`, generation hits `POST {base}/chat/completions`. Unlike
 * the Ollama-native mock above this must also speak the OpenAI request/response
 * shapes, so it doubles as coverage for the request adapter — the captured
 * `lastChatBody` lets a test assert that `format` was translated to
 * `response_format.json_schema` and that messages are OpenAI-shaped.
 *
 * Matches either localhost or 127.0.0.1 on port 1234 (the LM Studio default
 * and the preset URL), so it covers both the mock config host and the UI
 * preset default.
 * ------------------------------------------------------------------ */
const OPENAI_HOST_PATTERN = /(?:localhost|127\.0\.0\.1):1234\//;

function openAiModel(id) {
  return { id, object: 'model', owned_by: 'e2e-mock' };
}

/** OpenAI non-streaming chat completion envelope. */
function openAiChatResponse(content) {
  return {
    id: 'chatcmpl-e2e',
    object: 'chat.completion',
    created: 1,
    model: 'mock-text-model',
    choices: [
      {
        index: 0,
        message: { role: 'assistant', content },
        finish_reason: 'stop',
      },
    ],
  };
}

/** OpenAI SSE stream body that assembles to `content`, split in two chunks. */
function openAiStreamBody(content) {
  const mid = Math.ceil(content.length / 2);
  const parts = [content.slice(0, mid), content.slice(mid)];
  const frames = parts.map(
    (p) => `data: ${JSON.stringify({ choices: [{ delta: { content: p } }] })}`,
  );
  return [...frames, 'data: [DONE]'].join('\n\n') + '\n\n';
}

/**
 * Arm the OpenAI-compatible interceptor.
 *
 * @param capture mutable bucket — { models, chat, requests, lastChatBody } —
 *        updated in place so a test can assert call counts and inspect the
 *        translated request body the renderer actually sent.
 * @param tags    tag titles the mocked chat returns; tags mode parses the
 *        assistant content as JSON and reads `.topics` (same as Ollama).
 */
export async function armOpenAIMock(
  capture = { models: 0, chat: 0, requests: [], lastChatBody: null },
  tags = ['e2ealpha', 'e2ebeta', 'e2egamma'],
) {
  await global.client.route(OPENAI_HOST_PATTERN, async (route) => {
    const request = route.request();
    const url = request.url();
    const method = request.method();
    capture.requests.push(method + ' ' + url);

    if (method === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: CORS_HEADERS, body: '' });
      return;
    }
    if (url.includes('/models')) {
      capture.models += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: CORS_HEADERS,
        body: JSON.stringify({
          object: 'list',
          data: [openAiModel('mock-text-model'), openAiModel('mock-vision-model')],
        }),
      });
      return;
    }
    if (url.includes('/chat/completions')) {
      capture.chat += 1;
      let body = {};
      try {
        body = JSON.parse(request.postData() || '{}');
      } catch (e) {
        body = {};
      }
      capture.lastChatBody = body;
      const content = JSON.stringify({ topics: tags });
      if (body.stream) {
        await route.fulfill({
          status: 200,
          contentType: 'text/event-stream',
          headers: CORS_HEADERS,
          body: openAiStreamBody(content),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: CORS_HEADERS,
          body: JSON.stringify(openAiChatResponse(content)),
        });
      }
      return;
    }
    // Anything else the client might probe — keep it 200 so nothing throws.
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: CORS_HEADERS,
      body: '{}',
    });
  });
  return capture;
}

export async function disarmOpenAIMock() {
  await global.client.unroute(OPENAI_HOST_PATTERN);
}

/**
 * Open the AI generation dialog from the grid perspective toolbar and wait
 * for it to render. Assumes a location is open and at least one entry is
 * selected (the toolbar AI button is hidden on read-only locations).
 */
export async function openAiGenerationDialog() {
  await global.client.click('[data-tid=gridPerspectiveAiGenTID]');
  await global.client.waitForSelector('[data-tid=startTagsGenTID]', {
    state: 'visible',
    timeout: 10000,
  });
}
