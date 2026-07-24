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
 * Convenience presets shown in the "add AI engine" menu. A preset is pure
 * metadata over an engine type — it pre-fills name/URL/icon/setup-link but the
 * created provider only carries the generic `engine`. Adding a new
 * OpenAI-compatible backend (vLLM, Jan, …) means adding a row here, not a new
 * engine type or any client code.
 */
import { AIProviders } from '-/components/chat/ChatTypes';

export type AiPresetIcon = 'ollama' | 'ai';

export type AiPreset = {
  key: string;
  label: string;
  engine: AIProviders;
  defaultUrl: string;
  icon: AiPresetIcon;
  setupUrl?: string;
};

export const aiPresets: AiPreset[] = [
  {
    key: 'ollama',
    label: 'Ollama',
    engine: 'ollama',
    defaultUrl: 'http://localhost:11434',
    icon: 'ollama',
    setupUrl: 'https://ollama.com/download',
  },
  {
    key: 'lmstudio',
    label: 'LM Studio',
    engine: 'openai-compatible',
    // OpenAI base URL convention; the client tolerates a bare host too
    defaultUrl: 'http://localhost:1234/v1',
    icon: 'ai',
    setupUrl: 'https://lmstudio.ai',
  },
  {
    key: 'llamacpp',
    label: 'llama.cpp',
    engine: 'openai-compatible',
    defaultUrl: 'http://localhost:8080/v1',
    icon: 'ai',
    setupUrl: 'https://github.com/ggml-org/llama.cpp',
  },
  {
    key: 'openai-compatible',
    label: 'OpenAI-compatible',
    engine: 'openai-compatible',
    defaultUrl: '',
    icon: 'ai',
  },
];

/** Resolve the icon kind for an existing provider by its engine. */
export function presetIconForEngine(engine: AIProviders): AiPresetIcon {
  return engine === 'ollama' ? 'ollama' : 'ai';
}
