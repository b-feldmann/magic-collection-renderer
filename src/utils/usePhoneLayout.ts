import { useEffect, useState } from 'react';

// Keep in sync with the `.app` / `.mobileControls` tablet breakpoint in
// App.module.scss: below 600px the layout is a phone (collection above,
// compact controls below), at 600px and up it is the tablet side column.
export const PHONE_LAYOUT_MEDIA_QUERY = 'only screen and (max-width: 599.98px)';

/**
 * Tracks whether the viewport is in the phone layout. Re-renders when the
 * breakpoint is crossed (e.g. rotating the device) and cleans up its
 * listener on unmount.
 */
const usePhoneLayout = (): boolean => {
  const [isPhoneLayout, setIsPhoneLayout] = useState(
    () => window.matchMedia(PHONE_LAYOUT_MEDIA_QUERY).matches,
  );

  useEffect(() => {
    const mediaQueryList = window.matchMedia(PHONE_LAYOUT_MEDIA_QUERY);
    const handleChange = (event: MediaQueryListEvent) => setIsPhoneLayout(event.matches);
    setIsPhoneLayout(mediaQueryList.matches);
    mediaQueryList.addEventListener('change', handleChange);
    return () => mediaQueryList.removeEventListener('change', handleChange);
  }, []);

  return isPhoneLayout;
};

export default usePhoneLayout;
