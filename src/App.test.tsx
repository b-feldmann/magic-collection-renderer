import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App, { openMechanicEditor } from './App';

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />);
  });

  it('closes the card modal before opening the mechanic editor', () => {
    const closeCardModal = vi.fn();
    const openMechanicModal = vi.fn();

    openMechanicEditor(closeCardModal, openMechanicModal);

    expect(closeCardModal).toHaveBeenCalledBefore(openMechanicModal);
    expect(closeCardModal).toHaveBeenCalledWith(false);
    expect(openMechanicModal).toHaveBeenCalledWith(true);
  });
});
