import React from 'react';
import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { compile } from 'sass';
import { resolve } from 'node:path';

const css = compile(resolve('src/components/AnnotationList/Annotations.module.scss')).css;

it.each([
  { mobile: false, inset: '24px' },
  { mobile: true, inset: '16px' },
])(
  'includes the side gutter in the comment hover target (mobile: $mobile)',
  ({ mobile, inset }) => {
    const stylesheet = document.createElement('style');
    stylesheet.textContent = css;
    document.head.append(stylesheet);
    // jsdom does not evaluate media queries; apply the narrow-screen rules explicitly.
    const narrowStylesheet = document.createElement('style');
    if (mobile) {
      narrowStylesheet.textContent = Array.from(stylesheet.sheet!.cssRules)
        .filter(
          (rule): rule is CSSMediaRule =>
            rule instanceof CSSMediaRule && rule.conditionText === '(max-width: 480px)',
        )
        .map(rule =>
          Array.from(rule.cssRules)
            .map(child => child.cssText)
            .join('\n'),
        )
        .join('\n');
      document.head.append(narrowStylesheet);
    }
    try {
      render(
        <div className="list" data-testid="comment-list">
          <div className="listHeader">Comments</div>
          <article className="entry" aria-label="Comment">
            Message
          </article>
        </div>,
      );
      const list = getComputedStyle(screen.getByTestId('comment-list'));
      const comment = getComputedStyle(screen.getByRole('article'));
      // Spacing must belong to the hoverable article, not its parent.
      expect(list.paddingLeft).toBe('0px');
      expect(list.paddingRight).toBe('0px');
      expect(comment.width).toBe('100%');
      expect(comment.boxSizing).toBe('border-box');
      expect(comment.paddingLeft).toBe(inset);
      expect(comment.paddingRight).toBe(inset);
    } finally {
      stylesheet.remove();
      narrowStylesheet.remove();
    }
  },
);
