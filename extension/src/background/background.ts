import { DEFAULT_CONFIG, STORAGE_KEY, normalizeConfig } from '../shared/config';
import { getConfig } from '../shared/storage';

const api = (globalThis as any).chrome;

api.runtime.onInstalled.addListener(async () => {
  const raw = await api.storage.local.get(STORAGE_KEY);
  if (!raw[STORAGE_KEY]) {
    await api.storage.local.set({ [STORAGE_KEY]: DEFAULT_CONFIG });
  } else {
    await api.storage.local.set({ [STORAGE_KEY]: normalizeConfig(raw[STORAGE_KEY]) });
  }
});

api.runtime.onMessage.addListener((msg: any, _sender: any, sendResponse: (v: any) => void) => {
  (async () => {
    if (msg?.type === 'GET_CONFIG') {
      sendResponse({ ok: true, config: await getConfig() });
      return;
    }
    if (msg?.type === 'PING') {
      sendResponse({ ok: true, pong: true });
      return;
    }
    sendResponse({ ok: false, error: 'unknown message' });
  })();
  return true;
});
