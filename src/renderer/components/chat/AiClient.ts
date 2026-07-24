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
 * Engine-agnostic AI client used by ChatProvider. It hides the difference
 * between the Ollama-native SDK (`engine: 'ollama'`) and any OpenAI-compatible
 * server (`engine: 'openai-compatible'` — LM Studio, llama.cpp, vLLM, …).
 *
 * `pull`/`delete` are Ollama-only and therefore optional; OpenAI-compatible
 * servers manage their models externally, so those members are undefined and
 * the UI hides the corresponding controls.
 */
import { AIProvider } from '-/components/chat/ChatTypes';
import {
  deleteOllamaModel,
  getOllamaModels,
  newOllamaMessage,
  pullOllamaModel,
} from '-/components/chat/OllamaClient';
import {
  getOpenAIModels,
  newOpenAIMessage,
} from '-/components/chat/OpenAIClient';
import { ChatRequest, ModelResponse, Ollama } from 'ollama';

export interface AiClient {
  engine: AIProvider['engine'];
  list: () => Promise<ModelResponse[]>;
  chat: (
    msg: ChatRequest,
    chatMessageHandler?: (msgContent: string) => void,
  ) => Promise<string | undefined>;
  abort: () => void;
  /** Ollama-only: download a model with progress. Undefined elsewhere. */
  pull?: (model: string, progress: (part: any) => void) => Promise<boolean>;
  /** Ollama-only: delete an installed model. Undefined elsewhere. */
  delete?: (model: string) => Promise<string>;
}

async function getOllamaInstance(url: string): Promise<Ollama> {
  if (url) {
    try {
      //@ts-ignore - browser build has no bundled types entry
      const { Ollama } = await import('ollama/browser');
      return new Ollama({ host: url });
    } catch (error) {
      console.error('Failed to load Ollama module:', error);
    }
  }
  return undefined;
}

/**
 * Build the right AiClient for a provider. Returns undefined only when the
 * Ollama SDK fails to load; OpenAI-compatible clients are always constructable.
 */
export async function getAiClient(provider: AIProvider): Promise<AiClient> {
  if (!provider || !provider.url) {
    return undefined;
  }
  if (provider.engine === 'openai-compatible') {
    let controller: AbortController | undefined;
    return {
      engine: provider.engine,
      list: () => getOpenAIModels(provider.url, provider.authKey),
      chat: (msg, handler) => {
        controller = new AbortController();
        return newOpenAIMessage(
          provider.url,
          msg,
          handler,
          provider.authKey,
          controller.signal,
        );
      },
      abort: () => {
        if (controller) {
          controller.abort();
        }
      },
    };
  }
  // default: Ollama
  const ollama = await getOllamaInstance(provider.url);
  if (!ollama) {
    return undefined;
  }
  return {
    engine: 'ollama',
    list: () => getOllamaModels(ollama),
    chat: (msg, handler) => newOllamaMessage(ollama, msg, handler),
    abort: () => ollama.abort(),
    pull: (model, progress) => pullOllamaModel(ollama, model, progress),
    delete: (model) => deleteOllamaModel(ollama, model),
  };
}

/** Probe whether a provider's endpoint is reachable (models list succeeds). */
export function checkProviderAlive(provider: AIProvider): Promise<boolean> {
  return getAiClient(provider)
    .then((client) => (client ? client.list() : undefined))
    .then((m) => !!m)
    .catch(() => false);
}
