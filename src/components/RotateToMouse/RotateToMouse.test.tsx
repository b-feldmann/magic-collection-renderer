import React, { act } from 'react';
import { fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import RotateToMouse from './RotateToMouse';

describe('RotateToMouse', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('eases card tilt toward the pointer instead of jumping to the target angle', () => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.push(callback);
      return frames.length;
    });

    const { container } = render(
      <RotateToMouse>
        <div>Card</div>
      </RotateToMouse>,
    );
    const wrapper = container.firstElementChild as HTMLElement;
    const inner = wrapper.firstElementChild as HTMLElement;

    vi.spyOn(inner, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 100,
      bottom: 200,
      width: 100,
      height: 200,
      toJSON: () => ({}),
    });

    fireEvent.mouseEnter(wrapper, { clientX: 100, clientY: 200 });

    expect(inner.style.transform).toBe('');

    act(() => {
      frames.shift()?.(16);
    });

    const firstFrameAngle = Number(inner.style.transform.match(/rotateX\((-?[\d.]+)deg\)/)?.[1]);
    expect(Math.abs(firstFrameAngle)).toBeGreaterThan(0);
    expect(Math.abs(firstFrameAngle)).toBeLessThan(0.7);
  });

  it('eases the cover parallax toward the pointer instead of jumping to its offset', () => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.push(callback);
      return frames.length;
    });

    const { container } = render(
      <RotateToMouse>
        <div className="card-cover" />
      </RotateToMouse>,
    );
    const wrapper = container.firstElementChild as HTMLElement;
    const inner = wrapper.firstElementChild as HTMLElement;
    const cover = inner.firstElementChild as HTMLElement;

    vi.spyOn(inner, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 100,
      bottom: 200,
      width: 100,
      height: 200,
      toJSON: () => ({}),
    });

    fireEvent.mouseEnter(wrapper, { clientX: 100, clientY: 200 });

    expect(cover.style.transform).toBe('');

    act(() => {
      frames.shift()?.(16);
    });

    const firstFrameOffset = Number(cover.style.transform.match(/translateX\(([\d.]+)px\)/)?.[1]);
    expect(firstFrameOffset).toBeGreaterThan(0);
    expect(firstFrameOffset).toBeLessThan(7);
  });
});
