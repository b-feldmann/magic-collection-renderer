import { useContext, useEffect, useMemo } from 'react';
import AnnotationInterface from './interfaces/AnnotationInterface';
import { Store } from './store';
import { addSeenComments } from './actions/userActions';
import { UNKNOWN_CREATOR } from './utils/constants';

const EMPTY_ANNOTATIONS: AnnotationInterface[] = [];

export default function useUnreadComments(
  annotations: AnnotationInterface[] = EMPTY_ANNOTATIONS,
  open = false,
) {
  const { currentUser, dispatch } = useContext(Store);
  const seen = useMemo(() => new Set(currentUser.seenComments || []), [currentUser.seenComments]);
  // The placeholder user has no read state yet, so nothing can be known to be unread.
  // Your own comments never count as unread, so they aren't saved as read either.
  const unreadUuids =
    currentUser.uuid === UNKNOWN_CREATOR.uuid
      ? []
      : annotations.flatMap(annotation =>
          annotation.author !== currentUser.uuid && !seen.has(annotation.uuid)
            ? [annotation.uuid]
            : [],
        );
  const unreadKey = unreadUuids.join();

  useEffect(() => {
    if (!open || !unreadKey) return;
    addSeenComments(dispatch, unreadKey.split(','), currentUser).catch(() => {});
  }, [currentUser, dispatch, open, unreadKey]);

  return unreadUuids.length > 0;
}
