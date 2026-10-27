import React from 'react';
import { Col, Row } from 'antd';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { compile } from 'sass';
import { resolve } from 'node:path';

if (!window.matchMedia) {
  window.matchMedia = (media: string) => ({
    matches: false,
    media,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => false,
  });
}

describe('desktop editor column sizing', () => {
  it('does not let the grid span cap the fixed-width editor at 25%', () => {
    // Vitest does not apply CSS modules by default. Compile the real stylesheet
    // so this exercises its cascade against an actual Ant Design grid column.
    const stylesheet = document.createElement('style');
    stylesheet.textContent = compile(resolve('src/App.module.scss')).css;
    document.head.append(stylesheet);
    try {
      render(
        <div className="app">
          <Row>
            <Col span={6} className="editor" role="region" aria-label="Desktop editor">
              Card editor
            </Col>
          </Row>
        </div>,
      );
      const editor = screen.getByRole('region', { name: 'Desktop editor' });
      expect(editor).toHaveClass('ant-col-6');
      expect(getComputedStyle(editor).maxWidth).toBe('none');
    } finally {
      stylesheet.remove();
    }
  });
});
