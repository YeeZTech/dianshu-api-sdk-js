function readFlag(name) {
  try {
    const v = globalThis && globalThis[name];
    if (v === true) return true;
    if (v === false) return false;
    if (typeof v === 'string') return v === '1' || v.toLowerCase() === 'true';
    return false;
  } catch {
    return false;
  }
}

export function dsDebugEnabled() {
  return readFlag('DS_DEBUG');
}

export function dsDebugSecretsEnabled() {
  return readFlag('DS_DEBUG_SECRETS');
}

export function dsMask(s, keep = 8) {
  const str = String(s ?? '');
  if (str.length <= keep * 2) return str;
  return `${str.slice(0, keep)}…${str.slice(-keep)}`;
}

export function dsLog(...args) {
  if (!dsDebugEnabled()) return;
  // eslint-disable-next-line no-console
  console.log('[dianshu-sdk]', ...args);
}


