import React from 'react';
import { render } from '@testing-library/react';
import { compile } from 'sass';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import CollectionStats from './CollectionStats';
import styles from './collectionStats.module.scss';

const luminance = (rgb: number[]) => {
  const channels = rgb.map(value => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
};
const channels = (color: string) => (color.match(/[\d.]+/g) || []).map(Number);
const backgroundOf = (element: Element): number[] => {
  for (let node: Element | null = element; node; node = node.parentElement) {
    const rgb = channels(getComputedStyle(node).backgroundColor);
    if (rgb.length === 3 || rgb[3] === 1) return rgb.slice(0, 3);
  }
  return [255, 255, 255];
};

it('keeps essential small chart text readable against its rendered background', () => {
  const sheet = document.createElement('style');
  sheet.textContent = compile(
    resolve('src/components/CollectionStats/collectionStats.module.scss'),
  ).css.replace(/\.([a-zA-Z_]\w*)/g, (selector, name: string) =>
    styles[name] ? `.${styles[name]}` : selector,
  );
  document.head.append(sheet);
  try {
    const { container } = render(<CollectionStats fillHeight collection={[]} />);
    const selectors = [
      `.${styles.cmcLabel}`,
      `.${styles.axisLabel}`,
      `.${styles.gridLine} > span`,
      `.${styles.sectionHeading} > span`,
      `.${styles.chartHeading} > span`,
      `.${styles.metrics} span`,
      `.${styles.emptyState}`,
      `.${styles.summary}`,
      `.${styles.sectionNote}`,
      `.${styles.layoutSwitch} button`,
    ];
    const labels = [...container.querySelectorAll(selectors.join(','))];
    expect(labels.length).toBeGreaterThan(10);
    for (const label of labels) {
      const foreground = channels(getComputedStyle(label).color).slice(0, 3);
      expect(foreground).toHaveLength(3);
      const front = luminance(foreground);
      const back = luminance(backgroundOf(label));
      const contrast = (Math.max(front, back) + 0.05) / (Math.min(front, back) + 0.05);
      expect(
        contrast,
        `${label.textContent}: ${getComputedStyle(label).color}`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  } finally {
    sheet.remove();
  }
});

it('hides the legend scrollbar while retaining the scrollable legend container', () => {
  const css = compile(resolve('src/components/CollectionStats/collectionStats.module.scss')).css;
  expect(css).toContain('.legend');
  expect(css).toContain('scrollbar-width: none');
  expect(css).toContain('.legend::-webkit-scrollbar');
});

it('allows all three preview charts to share a normal desktop row', () => {
  const css = compile(resolve('src/components/CollectionStats/collectionStats.module.scss')).css;
  expect(css).toContain('grid-template-columns: repeat(3, minmax(0, 1fr))');
});
