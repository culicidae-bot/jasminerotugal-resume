/**
 * WCAG 2.1 contrast verification for every theme preset.
 *
 * Fails (exit 1) if any combination used for text fails 4.5:1, or if any
 * combination used for graphics/large text fails 3:1. Run after changing
 * preset tokens in src/data/design.js.
 */
import { presets } from '../src/data/design.js';
import { contrastRatio } from '../src/lib/contrast.js';

const TEXT_MIN = 4.5;
const GRAPHIC_MIN = 3;

const checks = [
  // Primary, secondary (soft), and dim text on page background and surface.
  { label: 'text on background', foreground: 'text', background: 'bg', min: TEXT_MIN },
  { label: 'soft text on background', foreground: 'muted', background: 'bg', min: TEXT_MIN },
  { label: 'dim text on background', foreground: 'dim', background: 'bg', min: TEXT_MIN },
  { label: 'text on surface', foreground: 'text', background: 'surface', min: TEXT_MIN },
  { label: 'soft text on surface', foreground: 'muted', background: 'surface', min: TEXT_MIN },
  { label: 'dim text on surface', foreground: 'dim', background: 'surface', min: TEXT_MIN },
  // Footer sits on the page background; its nav and links use body/soft text.
  { label: 'footer text on background', foreground: 'text', background: 'bg', min: TEXT_MIN },
  { label: 'footer soft text on background', foreground: 'muted', background: 'bg', min: TEXT_MIN },
  { label: 'footer dim text on background', foreground: 'dim', background: 'bg', min: TEXT_MIN },
  // Button foreground against button background.
  { label: 'primary button foreground', foreground: 'onPrimary', background: 'primary', min: TEXT_MIN },
  { label: 'link on background', foreground: 'link', background: 'bg', min: TEXT_MIN },
  { label: 'link on surface', foreground: 'link', background: 'surface', min: TEXT_MIN },
  // Education band (accent background).
  { label: 'education band text', foreground: 'onPrimary', background: 'primary', min: TEXT_MIN },
  { label: 'education band secondary', foreground: 'bandSoft', background: 'primary', min: TEXT_MIN },
  // Contact inverse section.
  { label: 'inverse section text', foreground: 'inverseText', background: 'inverseBg', min: TEXT_MIN },
  { label: 'inverse section soft text', foreground: 'inverseSoft', background: 'inverseBg', min: TEXT_MIN },
  // Status colors used as text on page and surface.
  { label: 'success on background', foreground: 'success', background: 'bg', min: TEXT_MIN },
  { label: 'success on surface', foreground: 'success', background: 'surface', min: TEXT_MIN },
  { label: 'warning on background', foreground: 'warning', background: 'bg', min: TEXT_MIN },
  { label: 'warning on surface', foreground: 'warning', background: 'surface', min: TEXT_MIN },
  { label: 'error on background', foreground: 'error', background: 'bg', min: TEXT_MIN },
  { label: 'error on surface', foreground: 'error', background: 'surface', min: TEXT_MIN },
  // Accent usage that is graphical or large-scale (rules, focus borders, marks).
  { label: 'accent graphics on background', foreground: 'primary', background: 'bg', min: GRAPHIC_MIN },
  { label: 'accent graphics on surface', foreground: 'primary', background: 'surface', min: GRAPHIC_MIN },
];

let failures = 0;
for (const preset of Object.values(presets)) {
  for (const check of checks) {
    const foreground = preset.colors[check.foreground];
    const background = preset.colors[check.background];
    const ratio = contrastRatio(foreground, background);
    const passed = ratio !== null && ratio >= check.min;
    const status = passed ? 'PASS' : 'FAIL';
    console.log(
      `${status}  ${preset.id.padEnd(16)} ${check.label.padEnd(34)} ${foreground} on ${background} = ${ratio?.toFixed(2) ?? 'n/a'} (min ${check.min})`,
    );
    if (!passed) failures += 1;
  }
}

if (failures > 0) {
  console.error(`\n${failures} contrast check(s) failed.`);
  process.exit(1);
}
console.log(`\nAll contrast checks pass for ${Object.keys(presets).length} presets.`);
