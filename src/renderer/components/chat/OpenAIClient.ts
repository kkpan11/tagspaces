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
 * Generic client for any OpenAI-compatible local/remote LLM server
 * (LM Studio, llama.cpp's llama-server, vLLM, Ollama's /v1 endpoint, …).
 *
 * It speaks only `GET /v1/models` and `POST /v1/chat/completions`, so it has
 * no notion of pulling/deleting models — those are Ollama-native and handled
 * by OllamaClient. The function surface mirrors OllamaClient so ChatProvider
 * can dispatch to either by engine.
 */
import { ChatRequest, ModelResponse } from 'ollama';
import { sanitizeJsonSchema } from '-/components/chat/openai-schema';

/**
 * Resolve the OpenAI base URL. The configured URL is treated as the base that
 * precedes `/v1` (the standard OpenAI `baseURL` convention), so both styles work:
 *   http://localhost:1234        → http://localhost:1234/v1
 *   http://localhost:1234/v1     → http://localhost:1234/v1   (no double /v1)
 *   https://openrouter.ai/api/v1 → https://openrouter.ai/api/v1
 * Callers append only the endpoint suffix (`/chat/completions`, `/models`).
 */
function apiBase(url: string): string {
  if (!url) {
    return url;
  }
  // drop trailing slashes, then a trailing /v1 so we can re-add it uniformly
  const base = url.replace(/\/+$/, '').replace(/\/v1$/, '');
  return `${base}/v1`;
}

/**
 * @param withBody set Content-Type for requests that carry a JSON body (POST).
 *   Omit it on GET so a no-auth request stays CORS-"simple" (no preflight).
 */
function buildHeaders(
  authKey?: string,
  withBody = false,
): Record<string, string> {
  const headers: Record<string, string> = {};
  if (withBody) {
    headers['Content-Type'] = 'application/json';
  }
  if (authKey) {
    headers.Authorization = `Bearer ${authKey}`;
  }
  return headers;
}

/**
 * List models via `GET /v1/models`. The OpenAI shape is `{ data: [{ id }] }`;
 * we map it onto the Ollama `ModelResponse` shape the UI already consumes
 * (only `name` is meaningful — size/dates are unknown for these servers).
 */
export async function getOpenAIModels(
  url: string,
  authKey?: string,
): Promise<ModelResponse[]> {
  if (!url) {
    return undefined;
  }
  try {
    const response = await fetch(`${apiBase(url)}/models`, {
      method: 'GET',
      headers: buildHeaders(authKey),
    });
    if (!response.ok) {
      return undefined;
    }
    const json = await response.json();
    const data = Array.isArray(json?.data) ? json.data : [];
    return data
      .filter((m) => m && m.id)
      .map(
        (m) =>
          ({
            name: m.id,
            model: m.id,
            modified_at: undefined,
            size: 0,
            digest: '',
            details: {
              family: 'openai-compatible',
              format: '',
              families: [],
              parameter_size: '',
              quantization_level: '',
            },
          }) as unknown as ModelResponse,
      );
  } catch (e) {
    console.log('getOpenAIModels', e);
    return undefined;
  }
}

/**
 * Translate the internal (Ollama-native) ChatRequest into an OpenAI
 * chat-completions body:
 *  - `messages[].images: [base64]` → `content: [{type:'text'}, {type:'image_url', ...}]`
 *  - Ollama `format: <jsonSchema>` → `response_format: { type:'json_schema', json_schema }`
 *  - `keep_alive` is dropped (no OpenAI equivalent)
 */
function toOpenAIRequest(msg: ChatRequest): Record<string, any> {
  const messages = (msg.messages || []).map((m: any) => {
    if (Array.isArray(m.images) && m.images.length > 0) {
      return {
        role: m.role,
        content: [
          ...(m.content ? [{ type: 'text', text: m.content }] : []),
          ...m.images.map((base64: string) => ({
            type: 'image_url',
            image_url: { url: 'data:image/jpeg;base64,' + base64 },
          })),
        ],
      };
    }
    return { role: m.role, content: m.content };
  });

  const body: Record<string, any> = {
    model: msg.model,
    messages,
    stream: !!msg.stream,
  };

  // Ollama puts the raw JSON schema in `format`; OpenAI wants response_format.
  const { format } = msg as any;
  if (format && typeof format === 'object') {
    body.response_format = {
      type: 'json_schema',
      json_schema: { name: 'result', schema: sanitizeJsonSchema(format) },
    };
  }
  return body;
}

/**
 * Send a chat message via `POST /v1/chat/completions`. When `msg.stream` is
 * true the response is parsed as SSE and `chatMessageHandler` receives each
 * delta; otherwise the full assistant content is returned.
 */
export async function newOpenAIMessage(
  url: string,
  msg: ChatRequest,
  chatMessageHandler?: (msgContent: string) => void,
  authKey?: string,
  signal?: AbortSignal,
): Promise<string | undefined> {
  if (!url) {
    return undefined;
  }
  const body = toOpenAIRequest(msg);
  // An empty messages array is the Ollama-only model load/unload idiom; OpenAI
  // servers reject it with HTTP 400 ("messages array cannot be empty"). Treat
  // it as a no-op so it never reaches the wire as a spurious error.
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return undefined;
  }
  try {
    const response = await fetch(`${apiBase(url)}/chat/completions`, {
      method: 'POST',
      headers: buildHeaders(authKey, true),
      body: JSON.stringify(body),
      signal,
    });
    if (!response.ok) {
      // Surface the server's error body — OpenAI-compatible servers (LM Studio,
      // llama.cpp, …) put the actual reason there (e.g. an unsupported
      // response_format/schema, or a non-vision model rejecting an image).
      const errBody = await response.text().catch(() => '');
      console.error(`newOpenAIMessage HTTP ${response.status} ${errBody}`);
      return undefined;
    }

    if (msg.stream && response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        // keep the last (possibly partial) line in the buffer
        buffer = lines.pop() || '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) {
            continue;
          }
          const data = trimmed.replace(/^data:\s*/, '');
          if (data === '[DONE]') {
            continue;
          }
          try {
            const json = JSON.parse(data);
            const delta = json?.choices?.[0]?.delta?.content;
            if (delta && chatMessageHandler) {
              chatMessageHandler(delta);
            }
          } catch (e) {
            // ignore keep-alive / non-JSON lines
          }
        }
      }
      return undefined;
    }

    const json = await response.json();
    return json?.choices?.[0]?.message?.content;
  } catch (e) {
    if ((e as any)?.name === 'AbortError') {
      return undefined;
    }
    console.error('newOpenAIMessage error', e);
    return undefined;
  }
}
