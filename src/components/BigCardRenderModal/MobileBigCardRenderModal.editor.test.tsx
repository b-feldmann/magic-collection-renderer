import React, { useState } from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import MobileBigCardRenderModal from './MobileBigCardRenderModal';
import { EMPTY_CARD } from '../../actions/cardActions';

vi.mock('../TemplatingCardRender/index', () => ({
  NonMemoCardRender: () => <div>Card preview</div>,
}));

const props = {
  card: { ...EMPTY_CARD(), uuid: 'editor-card' },
  visible: true,
  collectionNumber: 1,
  collectionSize: 1,
  width: 390,
  height: 844,
};

beforeEach(() => {
  window.history.replaceState(null, '', '/');
  const getStyle = window.getComputedStyle.bind(window);
  vi.spyOn(window, 'getComputedStyle').mockImplementation(element => getStyle(element));
});

afterEach(async () => {
  cleanup();
  await waitFor(() => expect(window.history.state).toBeNull());
  vi.restoreAllMocks();
});

function Example({ hide = () => {} }: { hide?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <MobileBigCardRenderModal
      {...props}
      hide={hide}
      mobileEditor={<input aria-label="Card name" defaultValue="Original name" />}
      mobileEditorOpen={open}
      onEditCard={() => setOpen(true)}
      onHideEditor={() => setOpen(false)}
    >
      <div>Card comments</div>
    </MobileBigCardRenderModal>
  );
}

describe('mobile inline card editor', () => {
  it('toggles the editor using the same control even without faces or variants', () => {
    const hide = vi.fn();
    render(<Example hide={hide} />);
    const toggle = screen.getByRole('button', { name: 'Edit card' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('textbox', { name: 'Card name' })).not.toBeInTheDocument();

    fireEvent.click(toggle);
    expect(toggle).toHaveAccessibleName('Hide editor');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('textbox', { name: 'Card name' })).toBeInTheDocument();
    fireEvent.click(toggle);
    expect(toggle).toHaveAccessibleName('Edit card');
    expect(screen.queryByRole('textbox', { name: 'Card name' })).not.toBeInTheDocument();
    expect(hide).not.toHaveBeenCalled();
  });

  it('places the editor below the card and above comments', () => {
    render(<Example />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit card' }));
    const preview = screen.getByText('Card preview');
    const editor = screen.getByRole('region', { name: 'Card editor' });
    const comments = screen.getByText('Card comments');
    expect(preview.compareDocumentPosition(editor) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(
      editor.compareDocumentPosition(comments) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('does not offer editing to callers without an editor', () => {
    render(<MobileBigCardRenderModal {...props} hide={() => {}} />);
    expect(screen.queryByRole('button', { name: 'Edit card' })).not.toBeInTheDocument();
  });
});
