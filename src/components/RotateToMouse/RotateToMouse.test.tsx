import React from 'react';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';

import RotateToMouse from './RotateToMouse';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const fire = (el: Element, type: string, x: number, y: number) =>
  act(() => {
    el.dispatchEvent(
      new MouseEvent(type, { clientX: x, clientY: y, bubbles: true, cancelable: true }),
    );
  });

describe('RotateToMouse', () => {
  let container: HTMLDivElement;
  let root: Root;
  let outer: HTMLElement;
  let inner: HTMLElement;
  let rectReads: number;

  const setup = async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    rectReads = 0;

    await act(async () => {
      root.render(
        <RotateToMouse>
          <div>
            <div className="card-cover" />
          </div>
        </RotateToMouse>,
      );
    });

    outer = container.firstElementChild as HTMLElement;
    inner = outer.firstElementChild as HTMLElement;
    inner.getBoundingClientRect = () => {
      rectReads += 1;
      return { left: 0, top: 0, width: 100, height: 100 } as DOMRect;
    };
  };

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('applies the tilt on the very first mousemove after entering', async () => {
    await setup();
    fire(inner, 'mouseover', 0, 0);
    fire(inner, 'mousemove', 50, 25);

    expect(inner.style.transform).toBe('rotateX(0.75deg) rotateY(0deg)');
  });

  it('reads the layout rect once per hover instead of on every mousemove', async () => {
    await setup();
    fire(inner, 'mouseover', 0, 0);
    fire(inner, 'mousemove', 20, 20);
    fire(inner, 'mousemove', 40, 40);
    fire(inner, 'mousemove', 60, 60);
    fire(inner, 'mousemove', 80, 80);

    expect(rectReads).toBe(1);
  });

  it('uses a short transition for cover parallax while hovering', async () => {
    await setup();
    fire(inner, 'mouseover', 0, 0);
    fire(inner, 'mousemove', 50, 25);

    const cover = inner.querySelector('.card-cover') as HTMLElement;
    expect(cover.style.transition).toBe('transform 0.1s');
  });

  it('glides the tilt back flat on mouseleave instead of snapping', async () => {
    await setup();
    fire(inner, 'mouseover', 50, 25);
    fire(inner, 'mousemove', 50, 25);
    fire(inner, 'mouseout', 0, 0);

    expect(inner.style.transform).toBe('rotateX(0deg) rotateY(0deg)');
    expect(inner.style.transition).toBe('transform 0.5s');
    const cover = inner.querySelector('.card-cover') as HTMLElement;
    expect(cover.style.transition).toBe('transform 0.5s');
    expect(cover.style.transform.trim()).toBe('scale(1)');
  });

  it('eases in on entry when no tilt was set before, then moves snappy', async () => {
    await setup();
    fire(inner, 'mouseover', 50, 25);
    expect(inner.style.transition).toBe('transform 0.1s');
    expect(inner.style.transform).toBe('rotateX(0.75deg) rotateY(0deg)');

    fire(inner, 'mousemove', 50, 25);
    expect(inner.style.transition).toBe('');
    expect(inner.style.transform).toBe('rotateX(0.75deg) rotateY(0deg)');
  });

  it('tracks the pointer on the untransformed wrapper so the hover area is stable', async () => {
    await setup();
    fire(outer, 'mouseover', 0, 0);
    fire(outer, 'mousemove', 50, 25);

    expect(inner.style.transform).toBe('rotateX(0.75deg) rotateY(0deg)');
  });
});
