// ***********************************************************************
// Package          : @flexops/sdk
// Author           : FlexOps, LLC
// Created          : 2026-03-04
//
// Copyright (c) 2021-2026 by FlexOps, LLC. All rights reserved.
// ***********************************************************************

import { FlexOpsError, WebhookEventType } from '../types.js';
import type { HttpClient } from '../http.js';
import type {
  ApiResponse,
  WebhookSubscription,
  CreateWebhookRequest,
  UpdateWebhookRequest,
} from '../types.js';

export class WebhooksResource {
  constructor(
    private readonly http: HttpClient,
    private readonly getWorkspaceId: () => string | undefined,
  ) {}

  private wsPath(suffix: string): string {
    const id = this.getWorkspaceId();
    if (!id) throw new Error('workspaceId is required.');
    return `/api/workspaces/${id}/webhooks${suffix ? `/${suffix}` : ''}`;
  }

  /** List all webhook subscriptions for the workspace. */
  async list(): Promise<ApiResponse<WebhookSubscription[]>> {
    return this.http.get(this.wsPath(''));
  }

  /** Get a webhook subscription by ID. */
  async get(webhookId: string): Promise<ApiResponse<WebhookSubscription>> {
    return this.http.get(this.wsPath(webhookId));
  }

  /**
   * Create a webhook subscription. `events` is sent as the Gateway's comma-separated `eventTypes`;
   * omit it to receive every event. The result's `data.secret` is the signing secret, returned only here.
   * @throws FlexOpsError (`UnknownWebhookEvent`) when `events` is empty or names an event FlexOps does not send.
   */
  async create(request: CreateWebhookRequest): Promise<ApiResponse<WebhookSubscription>> {
    const body = await this.http.post<unknown>(this.wsPath(''), toWireRequest(request));
    return toEnvelope(body);
  }

  /**
   * Update a webhook subscription. `events`, when given, replaces the subscribed events.
   * @throws FlexOpsError (`UnknownWebhookEvent`) when `events` is empty or names an event FlexOps does not send.
   */
  async update(webhookId: string, data: UpdateWebhookRequest): Promise<ApiResponse<WebhookSubscription>> {
    return this.http.put(this.wsPath(webhookId), toWireRequest(data));
  }

  /** Delete a webhook subscription. */
  async delete(webhookId: string): Promise<ApiResponse<unknown>> {
    return this.http.delete(this.wsPath(webhookId));
  }

  /** Rotate the signing secret for a webhook. */
  async rotateSecret(webhookId: string): Promise<ApiResponse<{ secret: string }>> {
    return this.http.post(this.wsPath(`${webhookId}/rotate-secret`));
  }

  /** List delivery logs for a webhook. */
  async listDeliveryLogs(webhookId: string): Promise<ApiResponse<unknown[]>> {
    return this.http.get(this.wsPath(`${webhookId}/deliveries`));
  }

  /**
   * Verify that an incoming request is a genuine FlexOps webhook delivery.
   *
   * FlexOps signs `{X-FlexOps-Timestamp}.{raw body}` with HMAC-SHA256, keyed with the
   * subscription secret (the whole `whsec_...` string), and sends
   * `X-FlexOps-Signature: sha256=<lowercase hex>`.
   *
   * @param payload The raw request body exactly as received (string or bytes). Do not pass
   *   re-serialized JSON: `JSON.stringify(req.body)` will not reproduce the signed bytes.
   * @param signature The `X-FlexOps-Signature` header. `sha256=<hex>` and bare `<hex>` are accepted.
   * @param secret The subscription signing secret.
   * @param timestamp The `X-FlexOps-Timestamp` header (Unix seconds).
   * @param options `toleranceSeconds` (default 300) bounds how far the timestamp may be from now
   *   in either direction; `now` (Unix seconds) overrides the clock, for tests.
   * @returns `true` only when the signature matches and the timestamp is within tolerance.
   * @throws TypeError when `secret` is empty or `payload` is not a string or bytes.
   */
  static verifySignature(
    payload: string | Uint8Array,
    signature: string | null | undefined,
    secret: string,
    timestamp: string | null | undefined,
    options: VerifySignatureOptions = {},
  ): boolean {
    if (typeof secret !== 'string' || secret.length === 0) {
      throw new TypeError('A webhook signing secret is required.');
    }
    if (typeof payload !== 'string' && !(payload instanceof Uint8Array)) {
      throw new TypeError('payload must be the raw request body as a string or bytes.');
    }
    const toleranceSeconds = options.toleranceSeconds ?? DEFAULT_TOLERANCE_SECONDS;
    if (!Number.isFinite(toleranceSeconds) || toleranceSeconds < 0) {
      throw new TypeError('toleranceSeconds must be a non-negative number.');
    }

    if (typeof signature !== 'string' || typeof timestamp !== 'string') return false;

    const ts = timestamp.trim();
    if (!/^[0-9]+$/.test(ts)) return false;
    const now = options.now ?? Date.now() / 1000;
    // Written so a NaN distance (a non-finite `now`) is rejected rather than treated as in range.
    if (!(Math.abs(now - Number(ts)) <= toleranceSeconds)) return false;

    let hex = signature.trim();
    if (hex.slice(0, SIGNATURE_PREFIX.length).toLowerCase() === SIGNATURE_PREFIX) {
      hex = hex.slice(SIGNATURE_PREFIX.length);
    }
    hex = hex.toLowerCase();
    // A SHA-256 digest is 64 hex characters; anything else (another scheme, a truncated or padded
    // value) cannot match and must not reach timingSafeEqual, which throws on a length mismatch.
    if (!/^[0-9a-f]{64}$/.test(hex)) return false;

    const crypto = loadNodeCrypto();
    const expected = crypto.createHmac('sha256', secret).update(`${ts}.`, 'utf8').update(payload).digest();
    return crypto.timingSafeEqual(Buffer.from(hex, 'hex'), expected);
  }
}

/** Options for {@link WebhooksResource.verifySignature}. */
export interface VerifySignatureOptions {
  /** Maximum distance, in seconds, between `X-FlexOps-Timestamp` and now. Defaults to 300. */
  toleranceSeconds?: number;
  /** The current time in Unix seconds. Defaults to the system clock; set it in tests. */
  now?: number;
}

const DEFAULT_TOLERANCE_SECONDS = 300;
const SIGNATURE_PREFIX = 'sha256=';
const KNOWN_EVENTS: ReadonlySet<string> = new Set(Object.values(WebhookEventType));

/**
 * The Gateway reads a comma-separated `eventTypes` string, ignores an `events` field (subscribing to
 * every event), and matches each name exactly. A name it never sends would leave the subscription
 * silent, so it is refused here instead.
 */
function toWireRequest(request: CreateWebhookRequest | UpdateWebhookRequest): Record<string, unknown> {
  const { events, ...rest } = request;
  if (events === undefined) return rest;
  if (!Array.isArray(events) || events.length === 0) {
    throw new FlexOpsError('events must name at least one event; omit it to receive every event.', 400, 'UnknownWebhookEvent');
  }
  const unknown = events.filter((name) => !KNOWN_EVENTS.has(name));
  if (unknown.length > 0) {
    throw new FlexOpsError(
      `Unknown webhook event: ${unknown.join(', ')}. FlexOps sends ${[...KNOWN_EVENTS].join(', ')}.`,
      400,
      'UnknownWebhookEvent',
    );
  }
  return { ...rest, eventTypes: [...new Set(events)].join(',') };
}

/**
 * The Gateway answers create with `201` and the bare subscription, not the `{ success, data }` envelope
 * its other webhook routes use. Wrap a bare body so `data.secret` holds the signing secret; pass an
 * envelope through unchanged.
 */
function toEnvelope(body: unknown): ApiResponse<WebhookSubscription> {
  if (isObject(body) && isObject(body.data)) return body as unknown as ApiResponse<WebhookSubscription>;
  return { success: true, data: body as WebhookSubscription };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

type NodeCrypto = typeof import('node:crypto');

/**
 * Loads node:crypto lazily so importing the SDK in a browser bundle does not pull it in.
 * `process.getBuiltinModule` works in both the ESM and CJS builds; `require` is only the CJS
 * fallback for older Node. The ESM build cannot use `require` at all (tsup's shim throws), which
 * is why the previous `require`-only helper always returned false when imported as an ES module.
 */
function loadNodeCrypto(): NodeCrypto {
  const fromProcess = globalThis.process?.getBuiltinModule?.('node:crypto');
  if (fromProcess) return fromProcess;
  if (typeof require === 'function') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('node:crypto') as NodeCrypto;
  }
  throw new Error('Webhook signature verification needs node:crypto (Node.js 20.16+ for the ES module build).');
}
