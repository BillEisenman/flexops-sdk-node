// ***********************************************************************
// Package          : @flexops/sdk
// Author           : FlexOps, LLC
// Created          : 2026-10-19
//
// Copyright (c) 2021-2026 by FlexOps, LLC. All rights reserved.
// ***********************************************************************

export type NodeCrypto = typeof import('node:crypto');

/**
 * Loads node:crypto lazily so importing the SDK in a browser bundle does not pull it in.
 * `process.getBuiltinModule` works in both the ESM and CJS builds; `require` is only the CJS
 * fallback for older Node. The ESM build cannot use `require` at all (tsup's shim throws), which
 * is why the previous `require`-only helper always returned false when imported as an ES module.
 */
export function loadNodeCrypto(purpose: string): NodeCrypto {
  const fromProcess = globalThis.process?.getBuiltinModule?.('node:crypto');
  if (fromProcess) return fromProcess;
  if (typeof require === 'function') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('node:crypto') as NodeCrypto;
  }
  throw new Error(`${purpose} needs node:crypto (Node.js 20.16+ for the ES module build).`);
}

/** A random UUID from Web Crypto (browsers, Node 19+), else node:crypto. */
export function randomUuid(): string {
  const webCrypto = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  return webCrypto?.randomUUID ? webCrypto.randomUUID() : loadNodeCrypto('Generating an Idempotency-Key').randomUUID();
}
