import { readFileSync } from 'node:fs';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  FlexOps,
  FlexOpsError,
  FlexOpsAuthError,
  FlexOpsRateLimitError,
  HazmatClassification,
  WebhookEventType,
  WorkspaceRole,
  RecurrenceInterval,
  ReportFormat,
  ReportFrequency,
  TrackingEmailEvent,
  type RateRequest,
} from '../src/index.js';
import { HttpClient } from '../src/http.js';

// Mock fetch for all tests
const mockFetch = vi.fn();

const rateRequest: RateRequest = {
  origin: { addressLine1: '123 Main St', city: 'New York', stateProvince: 'NY', postalCode: '10001' },
  destination: { addressLine1: '456 Oak Ave', city: 'Los Angeles', stateProvince: 'CA', postalCode: '90210' },
  package: { weight: 16, weightUnit: 'oz' },
};

function createClient(overrides?: Record<string, unknown>) {
  return new FlexOps({
    baseUrl: 'http://localhost:5000',
    apiKey: 'fxk_test_abc123',
    workspaceId: 'ws-test-001',
    fetch: mockFetch as unknown as typeof fetch,
    ...overrides,
  });
}

function jsonResponse(data: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: new Headers({ 'content-type': 'application/json' }),
    json: () => Promise.resolve(data),
  } as Response);
}

describe('FlexOps Client', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('initialization', () => {
    it('creates a client with default config', () => {
      const client = new FlexOps({ fetch: mockFetch as unknown as typeof fetch });
      expect(client).toBeDefined();
      expect(client.workspaceId).toBeUndefined();
    });

    it('creates a client with API key and workspace', () => {
      const client = createClient();
      expect(client.workspaceId).toBe('ws-test-001');
    });

    it('allows changing workspace ID', () => {
      const client = createClient();
      client.workspaceId = 'ws-new-001';
      expect(client.workspaceId).toBe('ws-new-001');
    });
  });

  describe('auth', () => {
    it('logs in and stores token', async () => {
      mockFetch.mockReturnValueOnce(
        jsonResponse({
          success: true,
          data: {
            token: 'jwt-token-123',
            refreshToken: 'refresh-456',
            expiresAt: '2026-03-05T00:00:00Z',
            userId: 'user-001',
          },
        }),
      );

      const client = createClient({ apiKey: undefined });
      const result = await client.auth.login({
        email: 'test@flexops.io',
        password: 'password123',
      });

      expect(result.success).toBe(true);
      expect(result.data?.token).toBe('jwt-token-123');
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/Account/login',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            email: 'test@flexops.io',
            password: 'password123',
          }),
        }),
      );
    });
  });

  describe('shipping', () => {
    it('gets rates', async () => {
      // api/shipping/rates returns a raw RateShoppingResponse (no {success,data} envelope).
      mockFetch.mockReturnValueOnce(
        jsonResponse({
          currency: 'USD',
          rates: [
            { carrierCode: 'USPS', carrierName: 'USPS', serviceCode: 'PRIORITY', serviceName: 'Priority Mail', rate: 8.5, currency: 'USD', estimatedDays: 2 },
            { carrierCode: 'UPS', carrierName: 'UPS', serviceCode: 'GROUND', serviceName: 'Ground', rate: 12.3, currency: 'USD', estimatedDays: 5 },
          ],
        }),
      );

      const client = createClient();
      const result = await client.shipping.getRates(rateRequest);

      expect(result.rates).toHaveLength(2);
      expect(result.rates[0]?.carrierCode).toBe('USPS');
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/shipping/rates',
        expect.objectContaining({ method: 'POST' }),
      );
      expect(JSON.parse(mockFetch.mock.calls[0]?.[1]?.body as string)).toEqual(rateRequest);
    });

    it('gets cheapest rate', async () => {
      // Raw ShippingRate (no envelope).
      mockFetch.mockReturnValueOnce(
        jsonResponse({ carrierCode: 'USPS', carrierName: 'USPS', serviceCode: 'GROUND_ADVANTAGE', serviceName: 'Ground Advantage', rate: 5.25, currency: 'USD', estimatedDays: 4 }),
      );

      const client = createClient();
      const result = await client.shipping.getCheapestRate(rateRequest);

      expect(result.rate).toBe(5.25);
    });

    it('validates an address', async () => {
      // Raw AddressValidationResult (no envelope).
      mockFetch.mockReturnValueOnce(jsonResponse({ isValid: true, warnings: [], validationUnavailable: false }));

      const client = createClient();
      const result = await client.shipping.validateAddress({
        name: 'John Doe',
        street1: '123 Main St',
        city: 'New York',
        state: 'NY',
        zip: '10001',
        country: 'US',
      });

      expect(result.isValid).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/addresses/validate',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('tracks a shipment', async () => {
      // Raw tracking object (no envelope).
      mockFetch.mockReturnValueOnce(
        jsonResponse({
          trackingNumber: '9400111899223456789012',
          carrier: 'USPS',
          status: 'In Transit',
          events: [{ timestamp: '2026-03-04T10:00:00Z', status: 'Departed', description: 'Left facility' }],
        }),
      );

      const client = createClient();
      const result = await client.shipping.track('9400111899223456789012');

      expect(result.carrier).toBe('USPS');
      expect(result.events).toHaveLength(1);
    });
  });

  describe('carriers', () => {
    it('calls USPS address validation', async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ success: true }));

      const client = createClient();
      await client.carriers.usps.validateAddress({ zipCode: '10001' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/ApiProxy/api/v3/AddressValidation/getUspsValidateAndCorrectAddress'),
        expect.any(Object),
      );
    });

    it('offers no label purchases the proxy closes (410) and no PATCH, which the proxy lacks', () => {
      const carriers = createClient().carriers as unknown as Record<string, Record<string, unknown>>;

      expect(carriers.usps.createReturnLabel).toBeUndefined();
      expect(carriers.usps.createInternationalLabel).toBeUndefined();
      expect(carriers.ups.createLabel).toBeUndefined();
      expect(carriers.fedex.createShipment).toBeUndefined();
      expect(carriers.fedex.createReturnShipment).toBeUndefined();
      expect(carriers.dhl.createShipment).toBeUndefined();
      expect(carriers.dhl.updatePickup).toBeUndefined();
    });

    it('keeps the deprecated proxy writes as keyed writes', async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ success: true }));

      await createClient().carriers.fedex.createPickup({ pickupDate: '2026-11-02' });

      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit & { headers: Record<string, string> }];
      expect(url).toBe('http://localhost:5000/api/ApiProxy/api/v3/CarrierPickup/postFedExCreateCarrierPickupRequest');
      expect(init.method).toBe('POST');
      expect(init.headers['Idempotency-Key']).toMatch(/^[0-9a-f-]{36}$/);
    });

    it('calls UPS tracking', async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ success: true }));

      const client = createClient();
      await client.carriers.ups.track({ trackingNumber: '1Z999AA10123456784' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/ApiProxy/api/v2/ShippingLabel/getSingleUpsTrackingDetail'),
        expect.any(Object),
      );
    });
  });

  describe('workspace resources', () => {
    it('lists workspaces', async () => {
      mockFetch.mockReturnValueOnce(
        jsonResponse({ success: true, data: [{ id: 'ws-001', name: 'My Workspace' }] }),
      );

      const client = createClient();
      const result = await client.workspaces.list();
      expect(result.data).toHaveLength(1);
    });

    it('creates webhook subscription', async () => {
      mockFetch.mockReturnValueOnce(
        jsonResponse({ success: true, data: { id: 'wh-001', url: 'https://example.com/hook' } }),
      );

      const client = createClient();
      await client.webhooks.create({
        url: 'https://example.com/hook',
        events: [WebhookEventType.LabelCreated, WebhookEventType.BatchCompleted],
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/workspaces/ws-test-001/webhooks',
        expect.objectContaining({ method: 'POST' }),
      );
      // The Gateway reads a comma-separated `eventTypes` (no spaces) and ignores `events`.
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body).toEqual({ url: 'https://example.com/hook', eventTypes: 'LabelCreated,BatchCompleted' });
    });

    it('returns the signing secret from the bare 201 body the Gateway sends on create', async () => {
      const created = {
        id: 'wh-001',
        url: 'https://example.com/hook',
        description: null,
        eventTypes: 'LabelCreated',
        status: 'Active',
        consecutiveFailures: 0,
        createdAt: '2026-10-16T00:00:00Z',
        updatedAt: null,
        secret: 'whsec_created',
      };
      mockFetch.mockReturnValueOnce(jsonResponse(created, 201));

      const client = createClient();
      const result = await client.webhooks.create({ url: 'https://example.com/hook', events: ['LabelCreated'] });

      expect(result).toEqual({ success: true, data: created });
      expect(result.data?.secret).toBe('whsec_created');
    });

    it('still reads a create response wrapped in the ApiResponse envelope', async () => {
      const envelope = { success: true, message: 'ok', data: { id: 'wh-001', secret: 'whsec_wrapped' } };
      mockFetch.mockReturnValueOnce(jsonResponse(envelope));

      const client = createClient();
      const result = await client.webhooks.create({ url: 'https://example.com/hook' });

      expect(result).toEqual(envelope);
      expect(result.data?.secret).toBe('whsec_wrapped');
    });

    it('omits eventTypes when no events are given, so the subscription receives every event', async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ success: true, data: { id: 'wh-001' } }));

      const client = createClient();
      await client.webhooks.create({ url: 'https://example.com/hook' });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body).toEqual({ url: 'https://example.com/hook' });
    });

    it('sends updated events as eventTypes', async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ success: true, data: { id: 'wh-001' } }));

      const client = createClient();
      await client.webhooks.update('wh-001', { events: [WebhookEventType.LabelCanceled], status: 'Active' });

      expect(mockFetch.mock.calls[0][0]).toBe('http://localhost:5000/api/workspaces/ws-test-001/webhooks/wh-001');
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body).toEqual({ eventTypes: 'LabelCanceled', status: 'Active' });
    });

    it.each([
      [['label.created']],
      [['LabelCreated', 'ShipmentCreated']],
      [[]],
    ])('refuses events %j that FlexOps never sends, without calling the API', async (events) => {
      const client = createClient();
      const call = client.webhooks.create({
        url: 'https://example.com/hook',
        events: events as unknown as WebhookEventType[],
      });

      await expect(call).rejects.toMatchObject({ name: 'FlexOpsError', code: 'UnknownWebhookEvent' });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('lists the event names the Gateway sends', () => {
      expect(Object.values(WebhookEventType)).toEqual([
        'LabelCreated',
        'LabelCanceled',
        'BatchCompleted',
        'TrackingUpdated',
        'TrackingDelivered',
      ]);
    });

    it('gets wallet balance', async () => {
      mockFetch.mockReturnValueOnce(
        jsonResponse({ success: true, data: { balance: 150.0, currency: 'USD', autoReloadEnabled: true } }),
      );

      const client = createClient();
      const result = await client.wallet.getBalance();
      expect(result.data?.balance).toBe(150.0);
    });
  });

  describe('error handling', () => {
    it('throws FlexOpsAuthError on 401', async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ message: 'Invalid token' }, 401));

      const client = createClient();
      await expect(client.workspaces.list()).rejects.toThrow(FlexOpsAuthError);
    });

    it('throws FlexOpsError on 400', async () => {
      mockFetch.mockReturnValueOnce(
        jsonResponse({ message: 'Validation failed', errors: ['weight is required'] }, 400),
      );

      const client = createClient();
      await expect(client.shipping.getRates(rateRequest)).rejects.toThrow(FlexOpsError);
    });

    it('throws FlexOpsRateLimitError on 429', async () => {
      // Return 429 for all retries
      for (let i = 0; i < 4; i++) {
        mockFetch.mockReturnValueOnce(
          Promise.resolve({
            ok: false,
            status: 429,
            statusText: 'Too Many Requests',
            headers: new Headers({ 'retry-after': '60', 'content-type': 'application/json' }),
            json: () => Promise.resolve({ message: 'Rate limited' }),
          } as Response),
        );
      }

      const client = new FlexOps({
        baseUrl: 'http://localhost:5000',
        apiKey: 'fxk_test_abc123',
        workspaceId: 'ws-test-001',
        fetch: mockFetch as unknown as typeof fetch,
        retry: { maxRetries: 1, baseDelay: 10 },
      });

      await expect(client.workspaces.list()).rejects.toThrow(FlexOpsRateLimitError);
    });

    it('retries on 500 errors', async () => {
      mockFetch
        .mockReturnValueOnce(jsonResponse({ message: 'Internal error' }, 500))
        .mockReturnValueOnce(jsonResponse({ success: true, data: [] }));

      const client = new FlexOps({
        baseUrl: 'http://localhost:5000',
        apiKey: 'fxk_test_abc123',
        workspaceId: 'ws-test-001',
        fetch: mockFetch as unknown as typeof fetch,
        retry: { maxRetries: 2, baseDelay: 10 },
      });

      const result = await client.workspaces.list();
      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('idempotency', () => {
    it('sends idempotency key header for label creation', async () => {
      mockFetch.mockReturnValueOnce(
        jsonResponse({ success: true, data: { labelId: 'lbl-001' } }),
      );

      const client = createClient();
      await client.shipping.createLabel({
        carrier: 'USPS',
        service: 'Priority Mail',
        fromAddress: { name: 'A', street1: '1 St', city: 'NY', state: 'NY', zip: '10001', country: 'US' },
        toAddress: { name: 'B', street1: '2 St', city: 'LA', state: 'CA', zip: '90210', country: 'US' },
        parcel: { weight: 16 },
        idempotencyKey: 'idem-key-001',
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch.mock.calls[0][1].headers['Idempotency-Key']).toBe('idem-key-001');
    });
  });

  describe('write retries', () => {
    const webhook = { url: 'https://example.com/hook', events: [WebhookEventType.LabelCreated] };

    function retryingClient() {
      return createClient({ retry: { maxRetries: 2, baseDelay: 1 } });
    }

    function keyOf(call: number): string | undefined {
      return mockFetch.mock.calls[call]?.[1]?.headers['Idempotency-Key'];
    }

    it('sends one generated Idempotency-Key on every attempt of a write', async () => {
      mockFetch
        .mockReturnValueOnce(jsonResponse({ message: 'Unavailable' }, 503))
        .mockReturnValueOnce(jsonResponse({ success: true, data: { id: 'wh-001' } }, 201));

      await retryingClient().webhooks.create(webhook);

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(keyOf(0)).toMatch(/^[0-9a-f-]{36}$/);
      expect(keyOf(1)).toBe(keyOf(0));
    });

    it("sends the caller's purchase key on every attempt, so the app's own retry is safe too", async () => {
      mockFetch
        .mockReturnValueOnce(jsonResponse({ message: 'Unavailable' }, 503))
        .mockReturnValueOnce(jsonResponse({ id: 'pol-1' }, 201))
        .mockReturnValueOnce(jsonResponse({ id: 'off-1' }, 201))
        .mockReturnValueOnce(jsonResponse({ id: 'off-1' }, 201));
      const client = retryingClient();

      await client.insurance.purchase({ trackingNumber: '9400', carrierCode: 'usps', declaredValue: 100 }, 'order-42-insurance');
      await client.carbonOffsets.purchase({ trackingNumber: '9400', weightLbs: 2, distanceMiles: 300 }, 'order-42-offset');
      await client.carbonOffsets.purchase({ trackingNumber: '9400', weightLbs: 2, distanceMiles: 300 }, 'order-42-offset');

      expect([0, 1, 2, 3].map(keyOf)).toEqual(['order-42-insurance', 'order-42-insurance', 'order-42-offset', 'order-42-offset']);
    });

    it('generates a new key for each separate write', async () => {
      mockFetch
        .mockReturnValueOnce(jsonResponse({ success: true, data: { id: 'wh-001' } }, 201))
        .mockReturnValueOnce(jsonResponse({ success: true, data: { id: 'wh-002' } }, 201));

      const client = retryingClient();
      await client.webhooks.create(webhook);
      await client.webhooks.create(webhook);

      expect(keyOf(1)).not.toBe(keyOf(0));
    });

    it('does not retry a write after a 500, which the Gateway does not replay', async () => {
      mockFetch.mockReturnValue(jsonResponse({ message: 'Internal error' }, 500));

      await expect(retryingClient().webhooks.create(webhook)).rejects.toMatchObject({ status: 500 });
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('retries a timed-out or dropped write with the same key', async () => {
      mockFetch
        .mockReturnValueOnce(Promise.reject(new TypeError('fetch failed')))
        .mockReturnValueOnce(jsonResponse({ success: true, data: { id: 'wh-001' } }, 201));

      await retryingClient().webhooks.create(webhook);

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(keyOf(1)).toBe(keyOf(0));
    });

    it('waits out an in-flight duplicate (409 IDEMPOTENCY_CONFLICT) and gets the replay', async () => {
      mockFetch
        .mockReturnValueOnce(jsonResponse({ success: false, errorCode: 'IDEMPOTENCY_CONFLICT' }, 409))
        .mockReturnValueOnce(jsonResponse({ success: true, data: { id: 'wh-001' } }, 201));

      const result = await retryingClient().webhooks.create(webhook);

      expect(result.data.id).toBe('wh-001');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('does not retry any other 409', async () => {
      mockFetch.mockReturnValue(jsonResponse({ success: false, errorCode: 'CONFLICT' }, 409));

      await expect(retryingClient().webhooks.create(webhook)).rejects.toMatchObject({ status: 409 });
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('does not resend a DELETE after a dropped connection or a 503', async () => {
      mockFetch.mockReturnValueOnce(Promise.reject(new TypeError('fetch failed')));
      await expect(retryingClient().webhooks.delete('wh-001')).rejects.toThrow('fetch failed');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      mockFetch.mockReset();
      mockFetch.mockReturnValue(jsonResponse({ message: 'Unavailable' }, 503));
      await expect(retryingClient().webhooks.delete('wh-001')).rejects.toMatchObject({ status: 503 });
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(keyOf(0)).toBeUndefined();
    });

    it('returns undefined for a 204 instead of the raw response', async () => {
      mockFetch.mockReturnValueOnce(Promise.resolve(new Response(null, { status: 204 })));
      const http = new HttpClient({ baseUrl: 'http://localhost:5000', fetch: mockFetch as unknown as typeof fetch });

      await expect(http.delete('/api/workspaces/ws-test-001/webhooks/wh-001')).resolves.toBeUndefined();
    });

    it('does not parse a body from a 204 that is labelled JSON', async () => {
      mockFetch.mockReturnValueOnce(
        Promise.resolve(new Response(null, { status: 204, headers: { 'content-type': 'application/json' } })),
      );
      const http = new HttpClient({ baseUrl: 'http://localhost:5000', fetch: mockFetch as unknown as typeof fetch });

      await expect(http.delete('/api/workspaces/ws-test-001/webhooks/wh-001')).resolves.toBeUndefined();
    });
  });

  describe('analytics', () => {
    it('fetches shipments trend', async () => {
      mockFetch.mockReturnValueOnce(
        jsonResponse({ success: true, data: [{ date: '2026-03-01', count: 42, totalCost: 315.5 }] }),
      );

      const client = createClient();
      const result = await client.analytics.shipmentsTrend({ period: 'day' });
      expect(result.data).toHaveLength(1);
    });

    it('fetches carrier summary', async () => {
      mockFetch.mockReturnValueOnce(
        jsonResponse({
          success: true,
          data: [
            { carrier: 'USPS', labelCount: 500, totalCost: 2250, averageCost: 4.5 },
            { carrier: 'UPS', labelCount: 200, totalCost: 1800, averageCost: 9.0 },
          ],
        }),
      );

      const client = createClient();
      const result = await client.analytics.carrierSummary();
      expect(result.data).toHaveLength(2);
    });
  });

  describe('orders', () => {
    it('reads orders through the legacy proxy and offers no order writes', async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ success: true, data: [] }));

      const client = createClient();
      await client.orders.getNewOrders();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/ApiProxy/api/v1/Order/getNewOrderList',
        expect.objectContaining({ method: 'GET' }),
      );
      const orders = client.orders as unknown as Record<string, unknown>;
      expect(orders.create).toBeUndefined();
      expect(orders.cancel).toBeUndefined();
    });
  });

  describe('insurance', () => {
    it('gets insurance providers', async () => {
      mockFetch.mockReturnValueOnce(
        jsonResponse({ success: true, data: ['FlexOps', 'U-PIC'] }),
      );

      const client = createClient();
      const result = await client.insurance.getProviders();
      expect(result.data).toEqual(['FlexOps', 'U-PIC']);
    });
  });

  describe('returns', () => {
    it('creates a return authorization', async () => {
      mockFetch.mockReturnValueOnce(
        jsonResponse({ success: true, data: { rmaId: 'rma-001', status: 'Pending' } }),
      );

      const client = createClient();
      const result = await client.returns.create({
        orderId: 'ord-001',
        reason: 'Defective',
        items: [{ sku: 'SKU-001', quantity: 1 }],
      });

      expect(result.data?.rmaId).toBe('rma-001');
    });

    it('sends the package weight and size on a return label (#672)', async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ success: true, data: { trackingNumber: '9400' } }));

      const client = createClient();
      await client.returns.generateLabel('RMA-001', {
        weightOz: 16,
        lengthIn: 10,
        widthIn: 8,
        heightIn: 4,
        hazmatClassification: HazmatClassification.None,
      });

      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toContain('/api/workspaces/ws-test-001/returns/RMA-001/label');
      expect(init.method).toBe('POST');
      expect(JSON.parse(init.body)).toEqual({
        weightOz: 16,
        lengthIn: 10,
        widthIn: 8,
        heightIn: 4,
        hazmatClassification: 0,
      });
    });

    it('always sends a JSON body on a return label, even with no options (#672)', async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ success: true, data: { trackingNumber: '9400' } }));

      const client = createClient();
      await client.returns.generateLabel('RMA-001');

      expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({});
    });
  });
});

describe('bounded label purchases', () => {
  beforeEach(() => mockFetch.mockReset());
  it('requires explicit approval and preserves the exact request/key through a conflict', async () => {
    const client = createClient({ retry: { maxRetries: 0 } });
    mockFetch.mockImplementationOnce(() => jsonResponse({ status: 'Preview', quotedPostageAmount: 8.5,
      maximumPostageAmount: 10, currency: 'USD', expiresAt: '2099-01-01T00:00:00Z', confirmationToken: 'signed-preview' }));
    const request = { origin: { addressLine1: 'Sender', city: 'Dallas', stateProvince: 'TX', postalCode: '75201' },
      destination: { addressLine1: 'Recipient', city: 'LA', stateProvince: 'CA', postalCode: '90210' },
      package: { weight: 8 }, carrierCode: 'USPS', serviceCode: 'PRIORITY', ConfirmationToken: 'remove-this' };
    const operation = await client.shipping.prepareLabel(request, 10, 'stable-key');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(JSON.parse(mockFetch.mock.calls[0][1].body).confirmationToken).toBeUndefined();
    request.carrierCode = 'UPS';
    mockFetch.mockImplementationOnce(() => jsonResponse({ errorCode: 'OutcomeUnknown', message: 'Reconcile the carrier outcome' }, 409));
    await expect(client.shipping.purchaseLabel(operation)).rejects.toMatchObject({ code: 'OutcomeUnknown', status: 409 });
    mockFetch.mockImplementationOnce(() => jsonResponse({ trackingNumber: 'tracking-1' }, 201));
    await expect(client.shipping.purchaseLabel(operation)).resolves.toMatchObject({ trackingNumber: 'tracking-1' });
    expect(mockFetch.mock.calls[1][1].body).toBe(mockFetch.mock.calls[2][1].body);
    for (const call of mockFetch.mock.calls) expect(call[1].headers['Idempotency-Key']).toBe('stable-key');
    expect(JSON.parse(mockFetch.mock.calls[1][1].body).carrierCode).toBe('USPS');
  });
  it('does not let the legacy USPS wrapper misread a preview as a label', async () => {
    mockFetch.mockImplementationOnce(() => jsonResponse({ status: 'Preview', confirmationToken: 'signed' }));
    await expect(createClient().carriers.usps.createDomesticLabel({})).rejects.toMatchObject({ code: 'ApprovalRequired' });
  });
});

describe('Gateway wire shapes (#6)', () => {
  beforeEach(() => mockFetch.mockReset());
  const label = { labelId: 'lbl-1', carrierCode: 'USPS', trackingNumber: '9400', labelData: '', labelFormat: 'PDF',
    rate: 8.5, currency: 'USD', isSandbox: true, createdAt: '2026-10-12T00:00:00Z' };
  const sentBody = (call = 0) => JSON.parse(mockFetch.mock.calls[call]?.[1]?.body as string);

  it('translates a legacy CreateLabelRequest to the Gateway LabelRequest', async () => {
    mockFetch.mockReturnValueOnce(jsonResponse(label, 201));

    await createClient().shipping.createLabel({
      carrier: 'USPS',
      service: 'PRIORITY',
      fromAddress: { name: 'A', company: 'Acme', street1: '1 St', street2: 'Ste 2', city: 'NY', state: 'NY', zip: '10001', country: 'US', phone: '555' },
      toAddress: { name: 'B', street1: '2 St', city: 'LA', state: 'CA', zip: '90210', country: 'US', email: 'b@example.com' },
      parcel: { weight: 16, weightUnit: 'oz', length: 6, width: 4, height: 2, dimensionUnit: 'in' },
      labelFormat: 'PDF',
      orderId: 42,
      hazmatClassification: HazmatClassification.None,
      idempotencyKey: 'idem-key-001',
    });

    expect(sentBody()).toEqual({
      carrierCode: 'USPS',
      serviceCode: 'PRIORITY',
      origin: { name: 'A', company: 'Acme', addressLine1: '1 St', addressLine2: 'Ste 2', city: 'NY', stateProvince: 'NY', postalCode: '10001', countryCode: 'US', phone: '555' },
      destination: { name: 'B', addressLine1: '2 St', city: 'LA', stateProvince: 'CA', postalCode: '90210', countryCode: 'US', email: 'b@example.com' },
      package: { weight: 16, weightUnit: 'oz', length: 6, width: 4, height: 2, dimensionUnit: 'in' },
      labelFormat: 'PDF',
      orderId: 42,
      hazmatClassification: 0,
    });
    expect(mockFetch.mock.calls[0]?.[1]?.headers['Idempotency-Key']).toBe('idem-key-001');
  });

  it('refuses a legacy return label instead of buying an outbound label', async () => {
    await expect(createClient().shipping.createLabel({
      carrier: 'USPS', service: 'PRIORITY', returnLabel: true,
      fromAddress: { name: 'A', street1: '1 St', city: 'NY', state: 'NY', zip: '10001', country: 'US' },
      toAddress: { name: 'B', street1: '2 St', city: 'LA', state: 'CA', zip: '90210', country: 'US' },
      parcel: { weight: 16 },
    })).rejects.toMatchObject({ code: 'UnsupportedRequestShape', status: 400 });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('refuses zip-only legacy rate requests before calling the Gateway', async () => {
    const legacy = { fromZip: '10001', toZip: '90210', weight: 16 };
    const shipping = createClient().shipping;
    for (const call of [shipping.getRates(legacy), shipping.getCheapestRate(legacy), shipping.getFastestRate(legacy)])
      await expect(call).rejects.toMatchObject({ code: 'UnsupportedRequestShape', status: 400 });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('sends validateAddress as the documented flat AddressValidationRequest', async () => {
    mockFetch.mockReturnValueOnce(jsonResponse({ isValid: true })).mockReturnValueOnce(jsonResponse({ isValid: true }));
    const canonical = { addressLine1: '123 Main St', city: 'New York', stateProvince: 'NY', postalCode: '10001' };

    await createClient().shipping.validateAddress({ name: 'J', street1: '123 Main St', street2: 'Apt 4', city: 'New York', state: 'NY', zip: '10001', country: 'CA' });
    await createClient().shipping.validateAddress(canonical);

    expect(sentBody(0)).toEqual({ name: 'J', line1: '123 Main St', line2: 'Apt 4', city: 'New York', state: 'NY', postalCode: '10001', country: 'CA' });
    // The Gateway defaults the country to US; the SDK sends it explicitly.
    expect(sentBody(1)).toEqual({ line1: '123 Main St', city: 'New York', state: 'NY', postalCode: '10001', country: 'US' });
  });

  it('sends hazmatClassification only when the caller sets it', async () => {
    mockFetch
      .mockReturnValueOnce(jsonResponse(label, 201))
      .mockReturnValueOnce(jsonResponse(label, 201))
      .mockReturnValueOnce(jsonResponse({ rates: [], currency: 'USD' }));
    const request = { ...rateRequest, carrierCode: 'USPS', serviceCode: 'PRIORITY' };
    const shipping = createClient().shipping;

    await shipping.createLabel(request);
    await shipping.createLabel({ ...request, hazmatClassification: HazmatClassification.LimitedQuantity });
    await shipping.getRates({ ...rateRequest, hazmatClassification: HazmatClassification.None });

    expect('hazmatClassification' in sentBody(0)).toBe(false);
    expect(sentBody(1).hazmatClassification).toBe(1);
    expect(sentBody(2).hazmatClassification).toBe(0);
  });
});

describe('international USPS contract', () => {
  beforeEach(() => mockFetch.mockReset());
  it('preserves customs in the approval snapshot and requires explicit purchase', async () => {
    const request = JSON.parse(readFileSync(new URL('../examples/international-label.json', import.meta.url), 'utf8'));
    const client = createClient({ retry: { maxRetries: 0 } });
    mockFetch.mockImplementationOnce(() => jsonResponse({ status: 'Preview', quotedPostageAmount: 28.5,
      maximumPostageAmount: 50, currency: 'USD', expiresAt: '2099-01-01T00:05:00Z', confirmationToken: 'signed' }));
    const approval = await client.shipping.prepareLabel(request, 50, 'international-1');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(JSON.parse(mockFetch.mock.calls[0][1].body).customsDeclaration).toEqual(request.customsDeclaration);
    request.customsDeclaration.items[0].description = 'mutated';
    mockFetch.mockImplementationOnce(() => jsonResponse({ labelId: 'intl-1', trackingNumber: 'test', rate: 28.5, currency: 'USD' }, 201));
    await client.shipping.purchaseLabel(approval);
    const sent = JSON.parse(mockFetch.mock.calls[1][1].body);
    expect(sent.customsDeclaration.items[0].description).toBe('Cotton shirt');
    expect(sent.shipDate).toBe('2099-01-01');
    expect(sent.orderId).toBe(42);
    expect(mockFetch.mock.calls[1][1].headers['Idempotency-Key']).toBe('international-1');
  });
  it('preserves the disabled gate refusal without retrying', async () => {
    mockFetch.mockImplementationOnce(() => jsonResponse({ errorCode: 'FeatureDisabled', message: 'International disabled' }, 403));
    await expect(createClient().shipping.getRates({ origin: {}, destination: {}, package: {} } as never))
      .rejects.toMatchObject({ status: 403, code: 'FeatureDisabled' });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

describe('documented-API alignment (3.0)', () => {
  beforeEach(() => mockFetch.mockReset());
  const sentBody = (call = 0) => JSON.parse(mockFetch.mock.calls[call]?.[1]?.body as string);
  const sent = (call = 0) => mockFetch.mock.calls[call] as [string, RequestInit & { headers: Record<string, string> }];
  const ok = (data: unknown = {}, status = 200) => mockFetch.mockReturnValueOnce(jsonResponse(data, status));

  it('reads the wallet balance for the configured workspace from my-balance', async () => {
    ok({ hasWallet: true, balanceCents: 1250, balance: 12.5 });

    const balance = await createClient().wallet.getBalance();

    expect(balance.balanceCents).toBe(1250);
    expect(sent()[0]).toBe('http://localhost:5000/api/wallet/my-balance');
    expect(sent()[1].headers['X-Workspace-Id']).toBe('ws-test-001');
  });

  it('sends member roles as Gateway numbers', async () => {
    ok().mockReturnValueOnce(jsonResponse({}));
    const workspaces = createClient().workspaces;

    await workspaces.inviteMember('a@b.c');
    await workspaces.updateMemberRole('u1', WorkspaceRole.Admin);

    expect(sentBody(0)).toEqual({ email: 'a@b.c', role: 2 });
    expect(sent(1)[0]).toBe('http://localhost:5000/api/workspaces/ws-test-001/members/u1/role');
    expect(sentBody(1)).toEqual({ newRole: 1 });
  });

  it('creates returns as RMAs and receives inspected items', async () => {
    ok({}, 201).mockReturnValueOnce(jsonResponse({}));
    const returns = createClient().returns;

    await returns.create({ orderId: 42, reason: 'Damaged', items: [{ sku: 'S1', quantity: 1 }] });
    await returns.markReceived('rma-1', {
      rmaNumber: 'RMA-1', warehouseId: 3, inspectedItems: [{ partNumber: 'S1', quantity: 1, disposition: 0 }],
    });

    expect(sent(0)[0]).toBe('http://localhost:5000/api/workspaces/ws-test-001/returns/rma');
    expect(sentBody(0).orderId).toBe(42);
    expect(sent(1)[0]).toBe('http://localhost:5000/api/workspaces/ws-test-001/returns/rma-1/receive');
    expect(sentBody(1).inspectedItems[0].disposition).toBe(0);
  });

  it('reorders rules with a POST of rule priorities', async () => {
    ok();

    await createClient().rules.reorder(['r-a', 'r-b']);

    expect(sent()[1].method).toBe('POST');
    expect(sentBody()).toEqual({ rules: [{ ruleId: 'r-a', priority: 0 }, { ruleId: 'r-b', priority: 1 }] });
  });

  it('deletes webhooks and rules on their documented routes and resolves nothing for the 204', async () => {
    mockFetch
      .mockReturnValueOnce(Promise.resolve(new Response(null, { status: 204 })))
      .mockReturnValueOnce(Promise.resolve(new Response(null, { status: 204 })));
    const client = createClient();

    await expect(client.webhooks.delete('wh-1')).resolves.toBeUndefined();
    await expect(client.rules.delete('r-1')).resolves.toBeUndefined();

    expect(sent(0)[0]).toBe('http://localhost:5000/api/workspaces/ws-test-001/webhooks/wh-1');
    expect(sent(0)[1].method).toBe('DELETE');
    expect(sent(1)[0]).toBe('http://localhost:5000/api/workspaces/ws-test-001/shipping-rules/r-1');
    expect(sent(1)[1].method).toBe('DELETE');
  });

  it('buys insurance through policies and carbon offsets through purchase, each with a key', async () => {
    ok({}, 201).mockReturnValueOnce(jsonResponse({}, 201));
    const client = createClient();

    await client.insurance.purchase({ trackingNumber: '9400', carrierCode: 'usps', declaredValue: 100 });
    await client.carbonOffsets.purchase({ trackingNumber: '9400', weightLbs: 2, distanceMiles: 300 });

    expect(sent(0)[0]).toBe('http://localhost:5000/api/workspaces/ws-test-001/insurance/policies');
    expect(sentBody(0)).toEqual({ trackingNumber: '9400', carrierCode: 'usps', declaredValue: 100 });
    expect(sent(1)[0]).toBe('http://localhost:5000/api/workspaces/ws-test-001/carbon-offsets/purchase');
    expect(sent(0)[1].headers['Idempotency-Key']).toMatch(/^[0-9a-f-]{36}$/);
    expect(sent(1)[1].headers['Idempotency-Key']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('looks up HS codes without a workspace in the path', async () => {
    ok([]);

    await createClient().hsCodes.search('shoes', { destinationCountry: 'CA' });

    expect(sent()[0]).toBe('http://localhost:5000/api/shipping/hs-codes/search?query=shoes&destinationCountry=CA');
  });

  it('schedules pickups with the Gateway address fields and lists scheduled pickups', async () => {
    ok().mockReturnValueOnce(jsonResponse({ success: true, data: [] }));
    const pickups = createClient().pickups;
    const request = {
      carrierCode: 'usps', pickupDate: '2026-10-20', street: '1 Main St', city: 'New York', state: 'NY',
      postalCode: '10001', packageCount: 2, totalWeightOz: 32,
    };

    await pickups.schedule(request);
    await pickups.list();

    expect(sentBody(0)).toEqual(request);
    expect(sent(1)[0]).toBe('http://localhost:5000/api/workspaces/ws-test-001/pickups/scheduled');
  });

  it('uses the login token (data.token) as the bearer for later requests', async () => {
    ok({ success: true, data: { token: 'jwt-1', refreshToken: 'r-1', requiresTwoFactor: false } });
    ok({ success: true, data: [] });
    const client = createClient({ apiKey: undefined });

    await client.auth.login({ email: 'a@b.c', password: 'x' });
    await client.workspaces.list();

    expect(sent(1)[1].headers['Authorization']).toBe('Bearer jwt-1');
  });

  it('refreshes with the documented {token, refreshToken} body and switches to the new token', async () => {
    ok({ success: true, data: { token: 'jwt-2', refreshToken: 'r-2' } });
    ok({ success: true, data: [] });
    const client = createClient({ apiKey: undefined, accessToken: 'jwt-expired' });

    await client.auth.refreshToken('r-1');
    await client.workspaces.list();

    expect(sent(0)[0]).toBe('http://localhost:5000/api/Account/refresh-token');
    expect(sentBody(0)).toEqual({ token: 'jwt-expired', refreshToken: 'r-1' });
    expect(sent(1)[1].headers['Authorization']).toBe('Bearer jwt-2');
  });

  it('refuses to refresh without an access token and sends nothing', async () => {
    const client = createClient({ apiKey: undefined });

    await expect(client.auth.refreshToken('r-1')).rejects.toBeInstanceOf(FlexOpsAuthError);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('restores recurring shipments on the documented routes with bare responses', async () => {
    ok({ id: 'r-1', name: 'Weekly', interval: 1 }, 201);
    mockFetch.mockReturnValueOnce(Promise.resolve(new Response(null, { status: 204 })));
    const recurring = createClient().recurringShipments;

    const created = await recurring.create({ name: 'Weekly', interval: RecurrenceInterval.Weekly, firstRunUtc: '2026-11-01T15:00:00Z', addressId: 'a-1' });
    const triggered = await recurring.trigger('r-1', 'caller-key');

    expect(created.name).toBe('Weekly');
    expect(sent(0)[0]).toBe('http://localhost:5000/api/workspaces/ws-test-001/recurring-shipments');
    expect(sentBody(0)).toEqual({ name: 'Weekly', interval: 1, firstRunUtc: '2026-11-01T15:00:00Z', addressId: 'a-1' });
    expect(triggered).toBeUndefined();
    expect(sent(1)[0]).toBe('http://localhost:5000/api/workspaces/ws-test-001/recurring-shipments/r-1/trigger');
    expect(sent(1)[1].method).toBe('POST');
    expect(sent(1)[1].headers['Idempotency-Key']).toBe('caller-key');
  });

  it('restores report schedules with enveloped responses and numeric enums', async () => {
    ok({ success: true, data: { id: 's-1', format: 0 } }, 201);
    ok({ success: true, data: null, message: 'Report schedule toggled' });
    const schedules = createClient().reportSchedules;

    const created = await schedules.create({
      reportType: 'shipments', format: ReportFormat.Csv, frequencyType: ReportFrequency.Weekly, dayOfWeek: 1,
      timeOfDayUtc: '08:00:00', recipientEmails: 'ops@example.com',
    });
    await schedules.toggle('s-1');

    expect(created.data?.id).toBe('s-1');
    expect(sent(0)[0]).toBe('http://localhost:5000/api/workspaces/ws-test-001/report-schedules');
    expect(sentBody(0)).toMatchObject({ format: 0, frequencyType: 1, dayOfWeek: 1, timeOfDayUtc: '08:00:00' });
    expect(sent(1)[0]).toBe('http://localhost:5000/api/workspaces/ws-test-001/report-schedules/s-1/toggle');
  });

  it('restores email templates as an upsert by event and a stateless preview', async () => {
    ok({ id: 't-1', eventType: 3, subjectTemplate: 's' });
    ok({ renderedSubject: 'S', renderedHtmlBody: 'B' });
    const templates = createClient().emailTemplates;

    const saved = await templates.upsert({ eventType: TrackingEmailEvent.Delivered, subjectTemplate: 's', htmlBodyTemplate: 'b' });
    const preview = await templates.preview({ subjectTemplate: 's', htmlBodyTemplate: 'b' });

    expect(saved.eventType).toBe(3);
    expect(sent(0)[0]).toBe('http://localhost:5000/api/workspaces/ws-test-001/email-templates');
    expect(sent(0)[1].method).toBe('PUT');
    expect(sentBody(0)).toEqual({ eventType: 3, subjectTemplate: 's', htmlBodyTemplate: 'b' });
    expect(preview.renderedSubject).toBe('S');
    expect(sent(1)[0]).toBe('http://localhost:5000/api/workspaces/ws-test-001/email-templates/preview');
  });

  it('sends a write answered 422 IDEMPOTENCY_KEY_REUSED once and surfaces the code', async () => {
    ok({ success: false, errorCode: 'IDEMPOTENCY_KEY_REUSED', message: 'This Idempotency-Key was already used for a different request.' }, 422);

    const error = await createClient().carbonOffsets.purchase({ trackingNumber: '9400', weightLbs: 1, distanceMiles: 10 }).catch(e => e);

    expect(error).toBeInstanceOf(FlexOpsError);
    expect(error).toMatchObject({ status: 422, code: 'IDEMPOTENCY_KEY_REUSED' });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('filters the returns list by the date range the Gateway accepts', async () => {
    ok({ success: true, data: [] });

    await createClient().returns.list({ startDate: '2026-10-01', endDate: '2026-10-19', page: 2, pageSize: 50 });

    expect(sent()[0]).toBe(
      'http://localhost:5000/api/workspaces/ws-test-001/returns?startDate=2026-10-01&endDate=2026-10-19&page=2&pageSize=50',
    );
  });
});
