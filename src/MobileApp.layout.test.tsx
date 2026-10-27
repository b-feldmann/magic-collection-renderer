import React from 'react';
import { Col, Row } from 'antd';
import { render, screen } from '@testing-library/react';
import { compile } from 'sass';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';

window.matchMedia ??= (media: string) => ({
  matches: false,
  media,
  onchange: null,
  addListener() {},
  removeListener() {},
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent: () => false,
});

it('lets the mobile collection shrink beside tablet controls instead of wrapping them below', () => {
  const stylesheet = document.createElement('style');
  stylesheet.textContent = compile(resolve('src/App.module.scss')).css;
  document.head.append(stylesheet);
  try {
    render(
      <Row className="app">
        <Col span={24} className="collectionWrapper" data-testid="mobile-collection">
          Collection
        </Col>
        <div className="mobileControls" data-testid="mobile-controls">
          Actions
        </div>
      </Row>,
    );
    const collection = getComputedStyle(screen.getByTestId('mobile-collection'));
    expect(collection.minWidth).toBe('0px');
    expect(collection.flexShrink).toBe('1');
    expect(getComputedStyle(screen.getByTestId('mobile-controls')).flexShrink).toBe('0');
  } finally {
    stylesheet.remove();
  }
});
