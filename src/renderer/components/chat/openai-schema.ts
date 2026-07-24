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
 * `zodToJsonSchema` (used by ChatProvider) emits a draft `$schema` declaration
 * and references additional `$defs`/`definitions`. Strict structured-output
 * validators on OpenAI-compatible servers (LM Studio, llama.cpp) reject the
 * `$schema` keyword and the `$ref` indirection with HTTP 400. Strip `$schema`
 * everywhere and inline single-definition `$ref`s so the schema is a plain,
 * self-contained object.
 *
 * Kept dependency-free (own module) so it stays unit-testable.
 */
// eslint-disable-next-line import/prefer-default-export
export function sanitizeJsonSchema(schema: any): any {
  if (!schema || typeof schema !== 'object') {
    return schema;
  }
  const defs = schema.$defs || schema.definitions;
  const resolveRef = (node: any): any => {
    if (Array.isArray(node)) {
      return node.map(resolveRef);
    }
    if (node && typeof node === 'object') {
      if (typeof node.$ref === 'string' && defs) {
        const key = node.$ref.replace(/^#\/(?:\$defs|definitions)\//, '');
        if (defs[key]) {
          return resolveRef(defs[key]);
        }
      }
      return Object.entries(node)
        .filter(
          ([k]) => k !== '$schema' && k !== '$defs' && k !== 'definitions',
        )
        .reduce(
          (acc, [k, v]) => {
            acc[k] = resolveRef(v);
            return acc;
          },
          {} as Record<string, any>,
        );
    }
    return node;
  };
  return resolveRef(schema);
}
