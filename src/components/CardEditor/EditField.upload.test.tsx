import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

import EditField from './EditField';

// The real resize needs a browser canvas; pass the base64 straight through.
vi.mock('../../utils/resizeImage', () => ({
  default: (base64: string, cb: (image: string) => void) => cb(base64),
}));

const pickFile = (fileName: string) => {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  const file = new File(['x'], fileName, { type: 'image/jpeg' });
  // jsdom does not implement `files` for injected change events.
  Object.defineProperty(input, 'files', { value: [file] });
  fireEvent.change(input);
};

const flushAsyncUpload = () =>
  act(async () => {
    // Two macrotask hops: antd's async beforeUpload chain, then jsdom's
    // FileReader load task.
    await new Promise(resolve => setTimeout(resolve, 0));
    await new Promise(resolve => setTimeout(resolve, 0));
  });

// The cover value lives in real React state (like CardEditor's tmpCard), so
// value changes re-render the field.
const Harness = ({ initialCover = '' }: { initialCover?: string }) => {
  const [cover, setCover] = React.useState(initialCover);

  return (
    <EditField
      fieldKey="cover"
      type="upload-input"
      name="Cover (URL)"
      getValue={() => cover}
      saveValue={(_key, value) => setCover(value)}
    />
  );
};

const getUrlInput = () => document.querySelector('input[type="text"]');

describe('EditField upload-input', () => {
  it('stores the file name together with the image data when picking a file', async () => {
    // Stub FileReader for a deterministic data URL; `onload` fires on the
    // next macrotask like the real implementation.
    vi.stubGlobal(
      'FileReader',
      class {
        result: string | null = null;
        onload: (() => void) | null = null;
        readAsDataURL() {
          this.result = 'data:image/jpeg;base64,xx';
          setTimeout(() => this.onload?.(), 0);
        }
      },
    );

    let cover = '';
    const props = {
      fieldKey: 'cover',
      type: 'upload-input' as const,
      name: 'Cover (URL)',
      getValue: () => cover,
      saveValue: (_key: string, value: string) => {
        cover = value;
      },
    };
    const { rerender } = render(<EditField {...props} />);

    await act(async () => {
      pickFile('League_Infobox_Anivia.jpg');
      await flushAsyncUpload();
    });
    rerender(<EditField {...props} />);

    expect(cover).toBe('base64:League_Infobox_Anivia.jpg|data:image/jpeg;base64,xx');
    vi.unstubAllGlobals();
  });

  it('shows the persisted file name instead of an editable URL for uploaded covers', () => {
    render(<Harness initialCover="base64:League_Infobox_Anivia.jpg|data:image/jpeg;base64,xx" />);

    // The file name is shown…
    expect(screen.getByText('League_Infobox_Anivia.jpg')).toBeInTheDocument();
    // …but the URL input is not editable for uploaded images.
    expect(getUrlInput()).not.toBeInTheDocument();
  });

  it('shows a fallback label for uploaded covers without a persisted file name', () => {
    render(<Harness initialCover="base64:olddata" />);

    expect(screen.getByText('Uploaded Image')).toBeInTheDocument();
    expect(getUrlInput()).not.toBeInTheDocument();
  });

  it('shows the persisted file name while the image is being loaded', () => {
    render(<Harness initialCover="loading:pic.jpg" />);

    expect(screen.getByText('pic.jpg')).toBeInTheDocument();
    expect(getUrlInput()).not.toBeInTheDocument();
  });

  it('drops the file name when another card without a cover is opened', () => {
    const { rerender } = render(
      <Harness key="card-1" initialCover="base64:pic.jpg|data:image/jpeg;base64,xx" />,
    );
    expect(screen.getByText('pic.jpg')).toBeInTheDocument();

    // A remount with a fresh (empty) value simulates opening another card.
    rerender(<Harness key="card-2" initialCover="" />);
    expect(screen.queryByText('pic.jpg')).not.toBeInTheDocument();
  });

  it('offers a control to remove an uploaded cover', () => {
    render(<Harness initialCover="base64:pic.jpg|data:image/jpeg;base64,xx" />);

    fireEvent.click(screen.getByRole('button', { name: /remove cover/i }));

    expect(getUrlInput()).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /remove cover/i })).not.toBeInTheDocument();
  });

  it('offers a control to remove a URL cover', () => {
    render(<Harness initialCover="url:https://example.com/x.jpg" />);

    fireEvent.click(screen.getByRole('button', { name: /remove cover/i }));

    expect(screen.queryByRole('button', { name: /remove cover/i })).not.toBeInTheDocument();
  });

  it('hides the remove control when no cover is set', () => {
    render(<Harness />);

    expect(screen.queryByRole('button', { name: /remove cover/i })).not.toBeInTheDocument();
  });
});
