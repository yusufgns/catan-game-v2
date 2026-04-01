/**
 * Style loader for the /models dev page.
 *
 * Style files live in public/styles/*.md.
 * They use a flat key:value frontmatter block between --- markers.
 * Dotted keys (e.g. palette.wallColor) are expanded into nested objects.
 * Values starting with # are parsed as hex numbers (Three.js Color ints).
 */

function parseValue(str) {
  if (str === 'true')  return true;
  if (str === 'false') return false;
  if (/^#[0-9a-fA-F]{3,8}$/.test(str)) return parseInt(str.slice(1), 16);
  if (str !== '' && !isNaN(str)) return Number(str);
  return str;
}

function parseFrontmatter(md) {
  const match = md.match(/^---\r?\n([\s\S]+?)\r?\n---/);
  if (!match) return {};

  const config = {};
  match[1].split('\n').forEach((line) => {
    const colonIdx = line.indexOf(':');
    if (colonIdx < 0) return;
    const key    = line.slice(0, colonIdx).trim();
    const rawVal = line.slice(colonIdx + 1).trim();
    if (!key || rawVal === '') return;

    const val   = parseValue(rawVal);
    const parts = key.split('.');
    let obj = config;
    for (let i = 0; i < parts.length - 1; i++) {
      if (typeof obj[parts[i]] !== 'object') obj[parts[i]] = {};
      obj = obj[parts[i]];
    }
    obj[parts[parts.length - 1]] = val;
  });

  return config;
}

/** Fetch and parse a style definition MD file. */
export async function loadStyle(id) {
  const resp = await fetch(`/styles/${id}.md`);
  if (!resp.ok) throw new Error(`Style not found: ${id}`);
  const text = await resp.text();
  return parseFrontmatter(text);
}

/** Fetch the list of available styles from the index. */
export async function listStyles() {
  const resp = await fetch('/styles/index.json');
  if (!resp.ok) throw new Error('Could not load styles/index.json');
  return resp.json();
}
