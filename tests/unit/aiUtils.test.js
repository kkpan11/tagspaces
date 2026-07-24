/* Copyright (c) 2016-present - TagSpaces GmbH. All rights reserved. */

import { expect, test } from '@playwright/test';
import { toBase64Image } from '-/services/base64';
import { sanitizeJsonSchema } from '-/components/chat/openai-schema';

/* ------------------------------------------------------------------ *
 * toBase64Image — regression for the "Maximum call stack size exceeded"
 * crash when describing an image via Ollama/LM Studio.
 * ------------------------------------------------------------------ */
test.describe('toBase64Image', () => {
  test('returns undefined for empty / nullish input', () => {
    expect(toBase64Image(undefined)).toBeUndefined();
    expect(toBase64Image(null)).toBeUndefined();
    expect(toBase64Image(new Uint8Array(0))).toBeUndefined();
  });

  test('encodes a small buffer to correct base64', () => {
    // bytes for "HI" -> btoa("HI") === "SEk="
    expect(toBase64Image(new Uint8Array([72, 73]))).toBe('SEk=');
  });

  test('round-trips arbitrary bytes via atob', () => {
    const bytes = new Uint8Array([0, 1, 2, 127, 128, 200, 254, 255]);
    const decoded = atob(toBase64Image(bytes));
    expect(decoded.length).toBe(bytes.length);
    for (let i = 0; i < bytes.length; i += 1) {
      expect(decoded.charCodeAt(i)).toBe(bytes[i]);
    }
  });

  test('encodes a large buffer without overflowing the call stack', () => {
    // > 32k chunk size, and far beyond the ~64k-arg apply() limit that the
    // old String.fromCharCode.apply(null, [...all]) hit. A real photo is MBs.
    const size = 2 * 1024 * 1024; // 2 MB
    const bytes = new Uint8Array(size);
    for (let i = 0; i < size; i += 1) {
      bytes[i] = i % 256;
    }
    let result;
    expect(() => {
      result = toBase64Image(bytes);
    }).not.toThrow();
    expect(typeof result).toBe('string');
    // base64 expands 3 bytes -> 4 chars
    expect(result.length).toBe(Math.ceil(size / 3) * 4);
    expect(atob(result).length).toBe(size);
  });
});

/* ------------------------------------------------------------------ *
 * sanitizeJsonSchema — regression for the LM Studio / llama.cpp HTTP 400
 * when sending a zodToJsonSchema-shaped response_format schema.
 * ------------------------------------------------------------------ */
test.describe('sanitizeJsonSchema', () => {
  test('strips the top-level $schema keyword', () => {
    const out = sanitizeJsonSchema({
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name'],
      additionalProperties: false,
    });
    expect(out.$schema).toBeUndefined();
    expect(out).toEqual({
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name'],
      additionalProperties: false,
    });
  });

  test('strips $schema / $defs / definitions at any depth', () => {
    const out = sanitizeJsonSchema({
      $schema: 'x',
      type: 'object',
      properties: {
        nested: {
          $schema: 'y',
          definitions: { foo: { type: 'string' } },
          type: 'object',
        },
      },
    });
    expect(out.$schema).toBeUndefined();
    expect(out.properties.nested.$schema).toBeUndefined();
    expect(out.properties.nested.definitions).toBeUndefined();
    expect(out.properties.nested.type).toBe('object');
  });

  test('inlines a $ref pointing into $defs', () => {
    const out = sanitizeJsonSchema({
      $schema: 'x',
      $defs: { Tag: { type: 'string', maxLength: 30 } },
      type: 'object',
      properties: {
        tags: { type: 'array', items: { $ref: '#/$defs/Tag' } },
      },
    });
    expect(out.$defs).toBeUndefined();
    expect(out.properties.tags.items).toEqual({
      type: 'string',
      maxLength: 30,
    });
  });

  test('inlines a $ref pointing into definitions', () => {
    const out = sanitizeJsonSchema({
      definitions: { Color: { type: 'string' } },
      type: 'object',
      properties: { color: { $ref: '#/definitions/Color' } },
    });
    expect(out.definitions).toBeUndefined();
    expect(out.properties.color).toEqual({ type: 'string' });
  });

  test('leaves a plain self-contained schema unchanged', () => {
    const schema = {
      type: 'object',
      properties: { a: { type: 'number' } },
      required: ['a'],
      additionalProperties: false,
    };
    expect(sanitizeJsonSchema(schema)).toEqual(schema);
  });

  test('passes non-object inputs through untouched', () => {
    expect(sanitizeJsonSchema(undefined)).toBeUndefined();
    expect(sanitizeJsonSchema(null)).toBeNull();
    expect(sanitizeJsonSchema('str')).toBe('str');
  });
});
