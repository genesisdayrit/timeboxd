import TurndownService from 'turndown';
import { marked } from 'marked';

// Configure marked for synchronous parsing
marked.use({ async: false });

// Configure turndown for consistent markdown output
const turndownService = new TurndownService({
  headingStyle: 'atx',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
});

// Preserve list structure with proper indentation
turndownService.addRule('listItem', {
  filter: 'li',
  replacement: (content, node, options) => {
    content = content
      .replace(/^\n+/, '')
      .replace(/\n+$/, '\n')
      .replace(/\n/gm, '\n    ');

    let prefix = options.bulletListMarker + ' ';
    const parent = node.parentNode as HTMLElement;

    if (parent?.nodeName === 'OL') {
      const start = parseInt(parent.getAttribute('start') || '1', 10);
      const index = Array.from(parent.children).indexOf(node as Element);
      prefix = (start + index) + '. ';
    }

    return prefix + content + (node.nextSibling && !/\n$/.test(content) ? '\n' : '');
  },
});

/**
 * Convert markdown string to HTML for TipTap
 */
export function parseMarkdownToHTML(markdown: string): string {
  if (!markdown) return '';
  return marked.parse(markdown) as string;
}

/**
 * Convert TipTap HTML back to markdown
 */
export function serializeToMarkdown(html: string): string {
  if (!html || html === '<p></p>') return '';

  // Clean up empty paragraphs
  const cleaned = html.replace(/<p><\/p>/g, '');
  if (!cleaned) return '';

  return turndownService.turndown(cleaned).trim();
}
