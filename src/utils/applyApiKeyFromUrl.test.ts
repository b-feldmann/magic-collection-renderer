import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { applyApiKeyFromUrl } from './applyApiKeyFromUrl';
import { deleteAccessToken, getAccessToken } from './accessService';

describe('applyApiKeyFromUrl', () => {
  beforeEach(() => {
    deleteAccessToken();
  });

  afterEach(() => {
    window.history.replaceState(null, '', '/');
  });

  const withUrl = (searchAndPath: string) => {
    window.history.replaceState(null, '', searchAndPath);
  };

  it('stores the apikey query parameter in localStorage', () => {
    withUrl('/?apikey=secret-token');
    applyApiKeyFromUrl();
    expect(getAccessToken()).toBe('secret-token');
  });

  it('accepts uppercase APIKEY parameter too', () => {
    withUrl('/?APIKEY=upper-token');
    applyApiKeyFromUrl();
    expect(getAccessToken()).toBe('upper-token');
  });

  it('removes the apikey parameter from the URL', () => {
    withUrl('/?apikey=secret-token&other=1');
    applyApiKeyFromUrl();
    expect(window.location.search).toBe('?other=1');
  });

  it('keeps URL intact when there is no apikey parameter', () => {
    withUrl('/?other=1');
    applyApiKeyFromUrl();
    expect(window.location.href).toContain('?other=1');
  });

  it('does not overwrite existing key when apikey value is empty', () => {
    localStorage.setItem('api_key', 'existing');
    withUrl('/?apikey=');
    applyApiKeyFromUrl();
    expect(getAccessToken()).toBe('existing');
  });
});
