import { useContext, useEffect, useMemo } from 'react';
import AnnotationInterface from './interfaces/AnnotationInterface';
import { Store } from './store';
import { addSeenComments } from './actions/userActions';

const EMPTY_ANNOTATIONS: AnnotationInterface[] = [];

export default function useUnreadComments(
  annotations: AnnotationInterface[] = EMPTY_ANNOTATIONS,
  open = false,
) {
  const { currentUser, dispatch } = useContext(Store);
  const seen = useMemo(() => new Set(currentUser.seenComments || []), [currentUser.seenComments]);
  const unread = annotations.some(annotation => !seen.has(annotation.uuid));

  useEffect(() => {
    if (!open || !unread) return;
    addSeenComments(
      dispatch,
      annotations.map(item => item.uuid),
      currentUser,
    ).catch(() => {});
  }, [annotations, currentUser, dispatch, open, unread]);

  return unread;
}
