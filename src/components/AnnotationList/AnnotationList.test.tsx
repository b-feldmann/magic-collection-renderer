import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import axios from 'axios';
import AnnotationList from './AnnotationList';
import { createAnnotation } from '../../actions/annotationActions';
import { Action, AnnotationActionType } from '../../reducer';

vi.mock('axios', () => ({ default: { post: vi.fn() } }));
vi.mock('../../utils/staticAntd', () => ({
  staticAntd: { message: { error: vi.fn() } },
}));

if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

beforeEach(() => vi.mocked(axios.post).mockReset());

const annotation = {
  uuid: 'comment-1',
  datetime: 1,
  author: 'author-1',
  content: 'My comment',
  cardReference: 'card-1',
  edited: false,
};

const submitComment = () => {
  const actions: Action[] = [];
  render(
    <AnnotationList
      annotations={[]}
      createAnnotation={(content, author) =>
        createAnnotation(action => actions.push(action), content, author, 'card-1')
      }
    />,
  );
  const field = screen.getByPlaceholderText('Your comment');
  fireEvent.change(field, { target: { value: 'My comment' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add Comment' }));
  return { field, actions };
};

it('keeps the draft pending and clears it only after HTTP 200 confirms creation', async () => {
  let respond!: (response: unknown) => void;
  vi.mocked(axios.post).mockImplementationOnce(() => new Promise(resolve => (respond = resolve)));
  const { field, actions } = submitComment();

  expect(field).toHaveValue('My comment');
  await act(async () => respond({ status: 200, data: { annotation } }));

  await waitFor(() => expect(field).toHaveValue(''));
  expect(actions).toEqual([
    { type: AnnotationActionType.CreateAnnotation, payload: { annotation } },
  ]);
});

it.each([201, 204, 400, 500])('keeps the draft for HTTP %s', async status => {
  vi.mocked(axios.post).mockResolvedValueOnce({ status, data: { annotation } });
  const { field, actions } = submitComment();
  await act(async () => {});

  expect(field).toHaveValue('My comment');
  expect(actions).toEqual([]);
});

it('keeps the draft when the request fails and allows retrying', async () => {
  vi.mocked(axios.post).mockRejectedValueOnce(new Error('Network error'));
  const { field } = submitComment();
  await act(async () => {});

  expect(field).toHaveValue('My comment');
  vi.mocked(axios.post).mockResolvedValueOnce({ status: 200, data: { annotation } });
  fireEvent.click(screen.getByRole('button', { name: /Add Comment/ }));
  await waitFor(() => expect(field).toHaveValue(''));
});

it('keeps the draft when HTTP 200 has no created comment', async () => {
  vi.mocked(axios.post).mockResolvedValueOnce({ status: 200, data: {} });
  const { field, actions } = submitComment();
  await act(async () => {});

  expect(field).toHaveValue('My comment');
  expect(actions).toEqual([]);
});

it('keeps header actions and comments while providing an accessible matching composer', () => {
  render(
    <AnnotationList
      annotations={[annotation]}
      createAnnotation={async () => true}
      headerExtra={<button>Release for rating</button>}
    >
      <div>Card preview</div>
    </AnnotationList>,
  );
  expect(screen.getByText('1 comments')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Release for rating' })).toBeInTheDocument();
  expect(screen.getByText('Card preview')).toBeInTheDocument();
  expect(screen.getByText('My comment')).toBeInTheDocument();
  expect(screen.getByText('Leave a comment')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Add emoji to comment' })).toBeInTheDocument();
  expect(screen.getByPlaceholderText('Your comment')).toBeInTheDocument();
});
