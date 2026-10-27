import { act, fireEvent } from '@testing-library/react';

// jsdom does not provide clipboard events or selection geometry.
export const prepareCommentInputTests = () => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  if (!globalThis.ClipboardEvent) {
    globalThis.ClipboardEvent = class extends Event {
      clipboardData: DataTransfer | null;
      constructor(type: string, init: ClipboardEventInit = {}) {
        super(type, init);
        this.clipboardData = init.clipboardData ?? null;
      }
    } as typeof ClipboardEvent;
  }
  Range.prototype.getBoundingClientRect ??= () => new DOMRect();
  Range.prototype.getClientRects ??= () => [] as unknown as DOMRectList;
  // Lexical measures native character movement for deletion. jsdom has none.
  Selection.prototype.modify ??= function (alter, direction) {
    const node = this.focusNode;
    if (!(node instanceof Text)) return;
    const offset = this.focusOffset;
    const next =
      direction === 'backward'
        ? offset - (Array.from(node.data.slice(0, offset)).slice(-1)[0]?.length ?? 0)
        : offset + (Array.from(node.data.slice(offset))[0]?.length ?? 0);
    if (alter === 'extend') this.extend(node, next);
    else this.collapse(node, next);
  };
};

export const selectCommentRange = async (field: HTMLElement, start: number, end = start) => {
  await act(async () => field.focus());
  await act(async () => {
    const walker = document.createTreeWalker(field, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    while (walker.nextNode()) nodes.push(walker.currentNode as Text);
    const point = (offset: number): [Node, number] => {
      for (const node of nodes) {
        if (offset <= node.length) return [node, offset];
        offset -= node.length;
      }
      return [field, field.childNodes.length];
    };
    const range = document.createRange();
    range.setStart(...point(start));
    range.setEnd(...point(end));
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));
  });
};

export const pasteCommentText = async (field: HTMLElement, text: string) => {
  await act(async () => {
    fireEvent(
      field,
      new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: {
          getData: (type: string) => (type === 'text/plain' ? text : '<b>untrusted HTML</b>'),
          types: ['text/plain', 'text/html'],
        } as unknown as DataTransfer,
      }),
    );
  });
};
