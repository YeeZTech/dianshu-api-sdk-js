import { Buffer as BufferPolyfill } from 'buffer';
if (typeof globalThis.Buffer === 'undefined') {
  globalThis.Buffer = BufferPolyfill;
}

import DSAPIContext from './DSAPIContext.js';
import DSAPIClient from './DSAPIClient.js';

export {
  DSAPIContext,
  DSAPIClient,
};
