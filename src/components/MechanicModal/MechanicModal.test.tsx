import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import MechanicModal from './MechanicModal';
import { Store, StoreType } from '../../store';
import { createMechanic, updateMechanic } from '../../actions/mechanicActions';

vi.mock('../../actions/mechanicActions', () => ({
  createMechanic: vi.fn(),
  updateMechanic: vi.fn(),
}));

const getComputedStyle = window.getComputedStyle;
vi.spyOn(window, 'getComputedStyle').mockImplementation(element => getComputedStyle(element));
vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);
vi.stubGlobal('matchMedia', (query: string) => ({
  matches: false,
  media: query,
  addListener() {},
  removeListener() {},
  addEventListener() {},
  removeEventListener() {},
}));
afterAll(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const mechanic = {
  uuid: 'mechanic-1',
  name: 'Flying',
  description: 'Can only be blocked by flyers.',
};
const dispatch = vi.fn();

const renderModal = (mechanics = [mechanic]) => {
  const store = { mechanics, cards: [], dispatch } as unknown as StoreType;
  const setVisible = vi.fn();
  const result = render(
    <Store.Provider value={store}>
      <MechanicModal visible setVisible={setVisible} />
    </Store.Provider>,
  );
  return {
    ...result,
    setVisible,
    setMechanics: (next: typeof mechanics) =>
      result.rerender(
        <Store.Provider value={{ ...store, mechanics: next }}>
          <MechanicModal visible setVisible={setVisible} />
        </Store.Provider>,
      ),
  };
};

describe('MechanicModal', () => {
  beforeEach(() => vi.clearAllMocks());

  it('edits names directly and only saves changed values on blur', () => {
    renderModal();
    const name = screen.getByRole('textbox', { name: 'Name' });
    expect(name).toHaveValue('Flying');
    fireEvent.change(name, { target: { value: 'Reach' } });
    expect(updateMechanic).not.toHaveBeenCalled();
    fireEvent.blur(name);
    expect(updateMechanic).toHaveBeenCalledExactlyOnceWith(
      dispatch,
      { ...mechanic, name: 'Reach' },
      [],
    );
    fireEvent.blur(name);
    expect(updateMechanic).toHaveBeenCalledTimes(1);
  });

  it('preserves a name edit when the description is saved before the store responds', () => {
    renderModal();
    const name = screen.getByRole('textbox', { name: 'Name' });
    fireEvent.change(name, { target: { value: 'Reach' } });
    fireEvent.blur(name);
    const description = screen.getByRole('textbox', { name: 'Description' });
    fireEvent.change(description, {
      target: { value: 'Can block creatures with flying.\nEven dragons.' },
    });
    fireEvent.blur(description);
    expect(updateMechanic).toHaveBeenLastCalledWith(
      dispatch,
      {
        uuid: 'mechanic-1',
        name: 'Reach',
        description: 'Can block creatures with flying.\nEven dragons.',
      },
      [],
    );
  });

  it('does not save unchanged fields', () => {
    renderModal();
    fireEvent.blur(screen.getByRole('textbox', { name: 'Name' }));
    fireEvent.blur(screen.getByRole('textbox', { name: 'Description' }));
    expect(updateMechanic).not.toHaveBeenCalled();
  });

  it('retries a failed save when the unchanged draft loses focus again', async () => {
    vi.mocked(updateMechanic).mockResolvedValueOnce(false);
    renderModal();
    const name = screen.getByRole('textbox', { name: 'Name' });
    fireEvent.change(name, { target: { value: 'Reach' } });
    fireEvent.blur(name);
    await waitFor(() => expect(updateMechanic).toHaveBeenCalledTimes(1));
    expect(name).toHaveValue('Reach');
    fireEvent.blur(name);
    expect(updateMechanic).toHaveBeenCalledTimes(2);
  });

  it('uses delayed store updates without replacing a newer local description', () => {
    const { setMechanics } = renderModal();
    const description = screen.getByRole('textbox', { name: 'Description' });
    fireEvent.change(description, { target: { value: 'New description' } });
    setMechanics([{ ...mechanic, name: 'Reach' }]);
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Reach');
    expect(description).toHaveValue('New description');
    fireEvent.blur(description);
    expect(updateMechanic).toHaveBeenLastCalledWith(
      dispatch,
      { ...mechanic, name: 'Reach', description: 'New description' },
      [],
    );
  });

  it('can add the first mechanic from the empty state', () => {
    renderModal([]);
    fireEvent.click(screen.getByRole('button', { name: /add mechanic/i }));
    expect(createMechanic).toHaveBeenCalledExactlyOnceWith(dispatch, []);
  });

  it('closes with Done without requiring a save button', () => {
    const { setVisible } = renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(setVisible).toHaveBeenCalledWith(false);
  });
});
