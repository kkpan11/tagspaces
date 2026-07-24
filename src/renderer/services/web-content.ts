/**
 * TagSpaces - universal file and folder organizer
 * Copyright (C) 2017-present TagSpaces GmbH
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
 * Platform-agnostic web-content processing ported from the TagSpaces browser
 * extension (../browser-ext: src/ui/popup.js + src/lib/utils.js). It turns a raw
 * HTML page into either sanitized HTML or Markdown, optionally extracting the
 * main article and inlining images as data URLs.
 *
 * All IO is injected (`fetchImage`) so this module stays free of `window`,
 * `electron` or `chrome` references.
 */

import { isProbablyReaderable, Readability } from '@mozilla/readability';
import DOMPurify from 'dompurify';
import TurndownService from 'turndown';

export interface ClipOptions {
  /** Absolute URL of the page, used to resolve relative image/asset URLs. */
  sourceUrl: string;
  /** Returns a `data:` URL for the given absolute image URL, or null on failure. */
  fetchImage: (url: string) => Promise<string | null>;
  /** Run Readability to keep only the main article. */
  extractArticle?: boolean;
  /** Inline referenced images as base64 `data:` URLs. */
  embedImages?: boolean;
  /** Comma-separated tags written into the Markdown front matter. */
  tags?: string;
  /** ISO timestamp stamped into metadata (injected so the package stays pure). */
  scrappedOn?: string;
  /** Also remove `<style>` tags and inline `style=` attributes (full clean). */
  stripStyles?: boolean;
}

type ImageTask = () => Promise<void>;

const IMG_BATCH_SIZE = 5;
// Cap how many images we inline so a hostile page can't trigger thousands of
// sub-resource fetches / a giant output file.
const MAX_INLINE_IMAGES = 200;

// Only inline images fetched over http/https. Image URLs come from untrusted
// page content, so block file:/data:/intranet schemes from being fetched.
function isHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

// ---------------------------------------------------------------------------
// Front matter helpers (ported from popup.js:914-956)
// ---------------------------------------------------------------------------

export function escapeYamlString(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

function formatFrontMatterEntry(key: string, value: string): string {
  if (key === 'tags') {
    const tags = value
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      .map((tag) => `  - "${escapeYamlString(tag)}"\n`)
      .join('');
    return `tags:\n${tags}`;
  }
  return `${key}: "${escapeYamlString(value)}"\n`;
}

/** Inject or update a YAML front-matter block at the top of the content. */
export function injectFrontMatter(
  content: string,
  newMeta: Record<string, string>,
): string {
  const frontMatterRegex = /^---\n([\s\S]*?)\n---/;
  const match = content.match(frontMatterRegex);

  if (match) {
    const existingYaml = match[1];
    const additionalYaml = Object.entries(newMeta)
      .filter(([key]) => !existingYaml.includes(`${key}:`))
      .map(([key, value]) => formatFrontMatterEntry(key, value))
      .join('');
    return content.replace(
      frontMatterRegex,
      `---\n${existingYaml}\n${additionalYaml}---`,
    );
  }

  const yamlBlock = Object.entries(newMeta)
    .map(([key, value]) => formatFrontMatterEntry(key, value))
    .join('');
  return `---\n${yamlBlock}---\n\n${content}`;
}

// ---------------------------------------------------------------------------
// Image helpers (ported from utils.js:20-61 + popup.js batching)
// ---------------------------------------------------------------------------

/** Robustly parse srcset and pick the highest-resolution URL (utils.js:20). */
export function getHighestResUrl(el: Element, baseUrl: string): string | null {
  const src = el.getAttribute('src');
  const srcset = el.getAttribute('srcset');
  const candidates: { url: string; value: number; type: 'w' | 'x' }[] = [];

  if (src) {
    candidates.push({ url: src, value: 1, type: 'x' });
  }

  if (srcset) {
    const regex = /([^,\s]+)\s*(?:(\d+)w|(\d+(?:\.\d+)?)x)?/g;
    Array.from(srcset.matchAll(regex)).forEach((match) => {
      const url = match[1];
      if (!url) {
        return;
      }
      const wDesc = match[2] ? parseInt(match[2], 10) : null;
      const xDesc = match[3] ? parseFloat(match[3]) : null;
      if (wDesc) {
        candidates.push({ url, value: wDesc, type: 'w' });
      } else if (xDesc) {
        candidates.push({ url, value: xDesc, type: 'x' });
      } else {
        candidates.push({ url, value: 1, type: 'x' });
      }
    });
  }

  if (candidates.length === 0) {
    return null;
  }

  // Rank candidates: prefer width ('w') descriptors over density ('x').
  const best = candidates.reduce((prev, curr) => {
    if (curr.type === 'w' && prev.type === 'w') {
      return curr.value > prev.value ? curr : prev;
    }
    if (curr.type === 'w' && prev.type === 'x') {
      return curr;
    }
    if (curr.type === 'x' && prev.type === 'w') {
      return prev;
    }
    return curr.value > prev.value ? curr : prev;
  });

  try {
    return new URL(best.url, baseUrl).href;
  } catch (e) {
    return null;
  }
}

async function processInBatches(
  tasks: ImageTask[],
  batchSize: number,
): Promise<void> {
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);
    // eslint-disable-next-line no-await-in-loop
    await Promise.all(batch.map((task) => task()));
  }
}

/** Inline `<img>`/`<video poster>` sources of a document as data URLs in place. */
async function inlineImagesInDoc(
  doc: Document,
  opts: ClipOptions,
): Promise<void> {
  const targets: { selector: string; attribute: string }[] = [
    { selector: 'img', attribute: 'src' },
    { selector: 'video[poster]', attribute: 'poster' },
  ];

  const tasks: ImageTask[] = targets.flatMap((target) =>
    Array.from(doc.querySelectorAll(target.selector))
      .map((el): ImageTask | null => {
        const originalUrl = el.getAttribute(target.attribute);
        if (!originalUrl || originalUrl.startsWith('data:')) {
          return null;
        }
        let absoluteUrl: string | null;
        try {
          absoluteUrl =
            target.selector === 'img'
              ? getHighestResUrl(el, opts.sourceUrl)
              : new URL(originalUrl, opts.sourceUrl).href;
        } catch (e) {
          return null;
        }
        if (!absoluteUrl || !isHttpUrl(absoluteUrl)) {
          return null;
        }
        const url = absoluteUrl;
        return async () => {
          const dataUrl = await opts.fetchImage(url);
          if (dataUrl && dataUrl.startsWith('data:image')) {
            el.setAttribute(target.attribute, dataUrl);
            el.removeAttribute('srcset');
          }
        };
      })
      .filter((task): task is ImageTask => task !== null),
  );

  await processInBatches(tasks.slice(0, MAX_INLINE_IMAGES), IMG_BATCH_SIZE);
}

/** Inline images referenced inside Markdown as data URLs (popup.js:824). */
async function inlineImagesInMarkdown(
  markdown: string,
  opts: ClipOptions,
): Promise<string> {
  const regexTargets = [
    { regex: /!\[(.*?)\]\(((?!data:).+?)(?:\s+"(.*?)")?\)/g, urlIndex: 2 },
    { regex: /<img\s+[^>]*src=["']((?!data:)[^"']+)["'][^>]*>/g, urlIndex: 1 },
  ];
  const replacements = new Map<string, string | null>();
  const tasks: ImageTask[] = [];

  regexTargets.forEach((target) => {
    Array.from(markdown.matchAll(target.regex)).forEach((match) => {
      const originalUrl = match[target.urlIndex];
      if (!originalUrl || replacements.has(originalUrl)) {
        return;
      }
      let absoluteUrl: string;
      try {
        absoluteUrl = new URL(originalUrl, opts.sourceUrl).href;
      } catch (e) {
        return;
      }
      if (!isHttpUrl(absoluteUrl)) {
        return;
      }
      replacements.set(originalUrl, null);
      tasks.push(async () => {
        const dataUrl = await opts.fetchImage(absoluteUrl);
        if (dataUrl && dataUrl.startsWith('data:image')) {
          replacements.set(originalUrl, dataUrl);
        } else {
          replacements.delete(originalUrl);
        }
      });
    });
  });

  await processInBatches(tasks.slice(0, MAX_INLINE_IMAGES), IMG_BATCH_SIZE);

  let result = markdown;
  Array.from(replacements.entries()).forEach(([originalUrl, dataUrl]) => {
    if (dataUrl) {
      const escapedUrl = originalUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      result = result.replace(new RegExp(escapedUrl, 'g'), dataUrl);
    }
  });
  return result;
}

// ---------------------------------------------------------------------------
// Core sanitize / extract pipeline
// ---------------------------------------------------------------------------

/** True when Readability considers the page a parseable article. */
export function isHtmlReaderable(html: string): boolean {
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return isProbablyReaderable(doc);
  } catch (e) {
    return false;
  }
}

/**
 * Parse raw HTML, optionally reduce it to the Readability article, and sanitize
 * it. DOMPurify strips `<script>` and inline event handlers by default; we also
 * always drop `<link>` (external stylesheets/resources), and — when
 * `stripStyles` is set — `<style>` tags and inline `style=` attributes too.
 * Returns a fresh sanitized Document.
 */
function buildCleanDoc(html: string, opts: ClipOptions): Document {
  const parser = new DOMParser();
  let workingHtml = html;

  if (opts.extractArticle) {
    try {
      const doc = parser.parseFromString(html, 'text/html');
      if (isProbablyReaderable(doc)) {
        const article = new Readability(doc).parse();
        if (article && article.content) {
          const title = article.title
            ? `<h1>${article.title
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')}</h1>\n`
            : '';
          workingHtml = title + article.content;
        }
      }
    } catch (e) {
      // fall back to the full page on any Readability failure
    }
  }

  // DOMPurify drops <script> + event handlers by default; we always also drop
  // <link>, and for a full clean <style> tags + inline style attributes.
  const clean = opts.stripStyles
    ? DOMPurify.sanitize(workingHtml, {
        WHOLE_DOCUMENT: true,
        FORBID_TAGS: ['script', 'link', 'style'],
        FORBID_ATTR: ['style'],
      })
    : DOMPurify.sanitize(workingHtml, {
        WHOLE_DOCUMENT: true,
        FORBID_TAGS: ['script', 'link'],
      });
  return parser.parseFromString(clean, 'text/html');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Produce sanitized, self-contained HTML with embedded source metadata. */
export async function htmlToCleanHtml(
  html: string,
  opts: ClipOptions,
): Promise<string> {
  const doc = buildCleanDoc(html, opts);

  if (opts.embedImages !== false) {
    await inlineImagesInDoc(doc, opts);
  }

  let { head } = doc;
  if (!head) {
    head = doc.createElement('head');
    doc.documentElement.insertBefore(head, doc.body);
  }
  if (!head.querySelector('meta[charset]')) {
    const charsetMeta = doc.createElement('meta');
    charsetMeta.setAttribute('charset', 'utf-8');
    head.insertBefore(charsetMeta, head.firstChild);
  }

  const { body } = doc;
  if (body) {
    body.setAttribute('data-createdwith', 'TagSpaces');
    body.setAttribute('data-sourceurl', opts.sourceUrl);
    if (opts.scrappedOn) {
      body.setAttribute('data-scrappedon', opts.scrappedOn);
    }
  }

  const doctype = doc.doctype
    ? `${new XMLSerializer().serializeToString(doc.doctype)}\n`
    : '<!DOCTYPE html>\n';
  return doctype + doc.documentElement.outerHTML;
}

/** Convert the (optionally article-extracted) page to Markdown with front matter. */
export async function htmlToMarkdown(
  html: string,
  opts: ClipOptions,
): Promise<string> {
  const doc = buildCleanDoc(html, opts);
  const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    fence: '```',
  });

  let markdown = '';
  try {
    markdown = turndownService.turndown(doc.body ? doc.body.innerHTML : '');
  } catch (e) {
    markdown = '';
  }

  if (opts.embedImages !== false) {
    markdown = await inlineImagesInMarkdown(markdown, opts);
  }

  const metadata: Record<string, string> = {
    url: opts.sourceUrl,
    date: opts.scrappedOn || '',
  };
  if (opts.tags && opts.tags.trim()) {
    metadata.tags = opts.tags.trim();
  }
  return injectFrontMatter(markdown, metadata);
}
