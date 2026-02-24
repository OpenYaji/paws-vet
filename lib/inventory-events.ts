import { EventEmitter } from 'events';

// Single global emitter shared across all API route handlers in the same process.
// Mutation routes (POST/PUT/PATCH/DELETE) call inventoryEmitter.emit('change')
// and the SSE endpoint listens to forward the event to every connected browser.
const inventoryEmitter: EventEmitter = (global as any).__inventoryEmitter ??
  ((global as any).__inventoryEmitter = new EventEmitter());

inventoryEmitter.setMaxListeners(100); // accommodate many concurrent SSE clients

export { inventoryEmitter };
