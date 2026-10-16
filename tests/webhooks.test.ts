import { describe, it, expect } from 'vitest';
import { WebhooksResource } from '../src/index.js';

// Fixed vector made outside this SDK with the Gateway algorithm (WebhookDeliveryService):
// lowercase hex HMAC-SHA256 over the UTF-8 string `{timestamp}.{raw body}`, keyed with the UTF-8
// bytes of the whole `whsec_...` secret. Computed with Python's hmac and cross-checked with
// `openssl dgst -sha256 -hmac`. Do not regenerate it with the code under test.
const SECRET = 'whsec_AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=';
const TIMESTAMP = '1760000000';
const BODY = '{"labelId":"lbl_123","trackingNumber":"9400100000000000000000","carrierCode":"USPS"}';
const SIGNATURE = 'sha256=02a9afec40dedbbd4e698f0ff995ba9f267651f836f94e571d7f6f28f6b8d1e9';
// What the old helper produced: HMAC of the body alone. A real delivery never carries it.
const BODY_ONLY_HEX = '7eaa376c69823a5a584fa676486bee36ed90dba3f13090b1fcfe5500c611689a';

const NOW = Number(TIMESTAMP);
interface Overrides {
  payload?: string | Uint8Array;
  signature?: string;
  secret?: string;
  timestamp?: string;
  now?: number;
  toleranceSeconds?: number;
}

// `in` checks, not defaults: an explicit `undefined` header must reach the helper as undefined.
const verify = (o: Overrides = {}) =>
  WebhooksResource.verifySignature(
    'payload' in o ? o.payload! : BODY,
    'signature' in o ? o.signature : SIGNATURE,
    'secret' in o ? o.secret! : SECRET,
    'timestamp' in o ? o.timestamp : TIMESTAMP,
    { now: o.now ?? NOW, toleranceSeconds: o.toleranceSeconds },
  );

describe('WebhooksResource.verifySignature', () => {
  it('accepts a delivery signed by the server algorithm', () => {
    expect(verify()).toBe(true);
  });

  it('accepts the raw body as bytes', () => {
    expect(verify({ payload: Buffer.from(BODY, 'utf8') })).toBe(true);
  });

  it('accepts the signature without the sha256= prefix', () => {
    expect(verify({ signature: SIGNATURE.slice('sha256='.length) })).toBe(true);
  });

  it('rejects another signature scheme prefix', () => {
    expect(verify({ signature: SIGNATURE.replace('sha256=', 'sha1=') })).toBe(false);
  });

  it('rejects the wrong secret', () => {
    expect(verify({ secret: 'whsec_not-the-secret' })).toBe(false);
  });

  it('rejects a tampered body', () => {
    expect(verify({ payload: BODY.replace('lbl_123', 'lbl_124') })).toBe(false);
  });

  it('rejects a timestamp header that was not the one signed', () => {
    expect(verify({ timestamp: '1760000001' })).toBe(false);
  });

  it('rejects the old body-only signature', () => {
    expect(verify({ signature: `sha256=${BODY_ONLY_HEX}` })).toBe(false);
    expect(verify({ signature: BODY_ONLY_HEX })).toBe(false);
  });

  it('accepts a timestamp exactly at the default 300 second tolerance', () => {
    expect(verify({ now: NOW + 300 })).toBe(true);
    expect(verify({ now: NOW - 300 })).toBe(true);
  });

  it('rejects a stale timestamp', () => {
    expect(verify({ now: NOW + 301 })).toBe(false);
  });

  it('rejects a timestamp too far in the future', () => {
    expect(verify({ now: NOW - 301 })).toBe(false);
  });

  it('honours a custom tolerance', () => {
    expect(verify({ now: NOW + 30, toleranceSeconds: 10 })).toBe(false);
    expect(verify({ now: NOW + 3600, toleranceSeconds: 7200 })).toBe(true);
  });

  it.each([undefined, '', ' ', 'abc', '-1760000000', '1.76e9', '1760000000.0', '0x68e0b800'])(
    'rejects a missing or non-numeric timestamp %j',
    (timestamp) => {
      expect(verify({ timestamp })).toBe(false);
    },
  );

  it.each([
    ['missing', undefined],
    ['empty', ''],
    ['prefix only', 'sha256='],
    ['one byte short', SIGNATURE.slice(0, -2)],
    ['one byte long', `${SIGNATURE}00`],
    ['non-hex', `sha256=${'z'.repeat(64)}`],
  ])('rejects a %s signature without throwing', (_label, signature) => {
    expect(() => verify({ signature })).not.toThrow();
    expect(verify({ signature })).toBe(false);
  });

  it('throws when the secret is missing', () => {
    expect(() => verify({ secret: '' })).toThrow(TypeError);
  });

  it('checks the timestamp against the real clock by default', () => {
    expect(WebhooksResource.verifySignature(BODY, SIGNATURE, SECRET, TIMESTAMP)).toBe(false);
  });
});
