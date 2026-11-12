import React, { useLayoutEffect, useRef } from 'react';
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import useFitWhenLaidOut from './useFitWhenLaidOut';

// Records the frame's ResizeObserver so the test can report a resize itself.
let resizeCallback: (() => void) | null = null;

class RecordingResizeObserver {
  constructor(callback: () => void) {
    resizeCallback = callback;
  }

  observe() {}

  unobserve() {}

  disconnect() {}
}

let laidOut = false;
const originalOffsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth');
const originalResizeObserver = globalThis.ResizeObserver;

beforeEach(() => {
  laidOut = false;
  resizeCallback = null;
  (globalThis as any).ResizeObserver = RecordingResizeObserver;
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
    configurable: true,
    get: () => (laidOut ? 1500 : 0),
  });
});

afterEach(() => {
  (globalThis as any).ResizeObserver = originalResizeObserver;
  if (originalOffsetWidth) {
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', originalOffsetWidth);
  }
});

const Card = ({ fit }: { fit: () => void }) => {
  const frameRef = useRef<HTMLDivElement>(null);
  const fitIfLaidOut = useFitWhenLaidOut(frameRef, fit);
  useLayoutEffect(() => {
    fitIfLaidOut();
  }, [fitIfLaidOut]);
  return <div ref={frameRef} />;
};

const reportResize = () => act(() => resizeCallback?.());

describe('useFitWhenLaidOut', () => {
  it('fits a visible card right away and not again on a resize', () => {
    laidOut = true;
    const fit = vi.fn();
    render(<Card fit={fit} />);
    expect(fit).toHaveBeenCalledTimes(1);

    reportResize();
    expect(fit).toHaveBeenCalledTimes(1);
  });

  it('skips the fit while the card is hidden and fits once it is shown', () => {
    const fit = vi.fn();
    render(<Card fit={fit} />);
    expect(fit).not.toHaveBeenCalled();

    reportResize();
    expect(fit).not.toHaveBeenCalled();

    laidOut = true;
    reportResize();
    expect(fit).toHaveBeenCalledTimes(1);

    reportResize();
    expect(fit).toHaveBeenCalledTimes(1);
  });
});
