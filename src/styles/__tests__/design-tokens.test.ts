import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..', '..');
const GLOBALS_CSS = path.join(ROOT, 'styles', 'globals.css');

function readToken(css: string, name: string): string {
  const match = css.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!match) throw new Error(`token ${name} not found in globals.css`);
  return match[1];
}

function relativeLuminance(hex: string): number {
  const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(fg: string, bg: string): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const [light, dark] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (light + 0.05) / (dark + 0.05);
}

function listTsxFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === 'node_modules') return [];
      return listTsxFiles(full);
    }
    return entry.name.endsWith('.tsx') && !entry.name.includes('.test.') ? [full] : [];
  });
}

describe('design tokens', () => {
  const css = fs.readFileSync(GLOBALS_CSS, 'utf8');

  it('muted foreground text meets 7:1 contrast on the page background', () => {
    const fg = readToken(css, '--color-muted-foreground');
    const bg = readToken(css, '--color-background');
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(7);
  });

  it('components do not dilute text tokens with opacity modifiers', () => {
    const offenders = listTsxFiles(ROOT).flatMap((file) => {
      const source = fs.readFileSync(file, 'utf8');
      const matches = source.match(/\btext-(foreground|muted-foreground|primary)\/\d+\b/g) ?? [];
      return matches.map((m) => `${path.relative(ROOT, file)}: ${m}`);
    });
    expect(offenders).toEqual([]);
  });

  it('components use theme tokens instead of raw Tailwind palette colors', () => {
    const palette =
      'gray|slate|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';
    const pattern = new RegExp(`\\b(?:hover:)?(?:text|bg|border)-(?:${palette})-\\d{2,3}\\b`, 'g');
    const offenders = listTsxFiles(ROOT).flatMap((file) => {
      const source = fs.readFileSync(file, 'utf8');
      const matches = source.match(pattern) ?? [];
      return matches.map((m) => `${path.relative(ROOT, file)}: ${m}`);
    });
    expect(offenders).toEqual([]);
  });
});
