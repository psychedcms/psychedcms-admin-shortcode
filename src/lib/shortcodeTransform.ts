const SHORTCODE_REGEX = /(?<!\\)\[\[([a-z-]+):([a-z0-9-]+)(?:\|([^\]]*?))?\]\]/g;
const SHORTCODE_TAG_REGEX = /<shortcode\s+type="([^"]*?)"\s+slug="([^"]*?)"(?:\s+label="([^"]*?)")?><\/shortcode>/g;

/**
 * Transforms shortcode text notation to HTML tags for TipTap parsing.
 * [[type:slug]] -> <shortcode type="type" slug="slug"></shortcode>
 * [[type:slug|label]] -> <shortcode type="type" slug="slug" label="label"></shortcode>
 */
export function shortcodeTextToHtml(html: string): string {
  return html.replace(SHORTCODE_REGEX, (_match, type: string, slug: string, label?: string) => {
    const labelAttr = label ? ` label="${escapeAttr(label)}"` : '';
    return `<shortcode type="${escapeAttr(type)}" slug="${escapeAttr(slug)}"${labelAttr}></shortcode>`;
  });
}

/**
 * Transforms shortcode HTML tags back to text notation for storage.
 * <shortcode type="type" slug="slug" label="label"></shortcode> -> [[type:slug|label]]
 */
export function shortcodeHtmlToText(html: string): string {
  return html.replace(SHORTCODE_TAG_REGEX, (_match, type: string, slug: string, label?: string) => {
    const labelPart = label ? `|${label}` : '';
    return `[[${type}:${slug}${labelPart}]]`;
  });
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
