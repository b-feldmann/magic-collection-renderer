import { resolve } from 'node:path';
import { compile } from 'sass';
import { expect, it } from 'vitest';

import styles from './Annotations.module.scss';

it('centers emoji popups only at the mobile breakpoint', () => {
  const stylesheet = document.createElement('style');
  stylesheet.textContent = compile(resolve('src/components/AnnotationList/Annotations.module.scss'))
    .css.replace(/:global\(([^)]+)\)/g, '$1')
    .replace(/\.([_a-zA-Z][\w-]*)/g, (selector, name: string) =>
      styles[name] ? `.${styles[name]}` : selector,
    );
  const popup = document.createElement('div');
  popup.className = styles.emojiPopover;
  popup.style.left = '17px'; // Ant Design normally aligns to the trigger.
  document.head.append(stylesheet);
  document.body.append(popup);
  const mobileStyles = document.createElement('style');
  try {
    expect(getComputedStyle(popup).left).toBe('17px');
    // jsdom does not evaluate viewport media queries; activate the actual mobile rules.
    const mobileRule = Array.from(stylesheet.sheet!.cssRules).find(
      rule => rule instanceof CSSMediaRule && rule.conditionText === '(max-width: 480px)',
    ) as CSSMediaRule;
    mobileStyles.textContent = Array.from(mobileRule.cssRules, rule => rule.cssText).join('\n');
    document.head.append(mobileStyles);
    expect(getComputedStyle(popup).left).toBe(`${window.innerWidth / 2}px`);
    expect(getComputedStyle(popup).translate).toBe('-50% 0');
  } finally {
    popup.remove();
    stylesheet.remove();
    mobileStyles.remove();
  }
});

it('preserves the emoji picker flex layout inside the reaction popup', () => {
  const stylesheet = document.createElement('style');
  stylesheet.textContent = compile(resolve('src/components/AnnotationList/Annotations.module.scss'))
    .css.replace(/:global\(([^)]+)\)/g, '$1')
    .replace(/\.([_a-zA-Z][\w-]*)/g, (selector, name: string) =>
      styles[name] ? `.${styles[name]}` : selector,
    );
  const container = document.createElement('div');
  container.className = styles.reactionPicker;
  const picker = document.createElement('em-emoji-picker');
  container.append(picker);
  document.head.append(stylesheet);
  document.body.append(container);
  try {
    // Emoji Mart needs a flex host to constrain its internal scrolling area.
    expect(getComputedStyle(picker).display).toBe('flex');
    expect(getComputedStyle(picker).maxHeight).toBe('min(435px, 100dvh - 48px)');
    expect(getComputedStyle(picker).minHeight).toBe('0px');
  } finally {
    container.remove();
    stylesheet.remove();
  }
});
