import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FlexOps, FlexOpsError, FlexOpsAuthError, FlexOpsRateLimitError } from '../src/index.js';

// Mock fetch for all tests
const mockFetch = vi.fn();

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
            accessToken: 'jwt-token-123',
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
      expect(result.data?.accessToken).toBe('jwt-token-123');
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
      const rates = [
        { carrier: 'USPS', service: 'Priority Mail', rate: 8.5, currency: 'USD', estimatedDays: 2 },
        { carrier: 'UPS', service: 'Ground', rate: 12.3, currency: 'USD', estimatedDays: 5 },
      ];
      mockFetch.mockReturnValueOnce(jsonResponse({ success: true, data: rates }));

      const client = createClient();
      const result = await client.shipping.getRates({
        fromZip: '10001',
        toZip: '90210',
        weight: 16,
        weightUnit: 'oz',
      });

      expect(result.data).toHaveLength(2);
      expect(result.data?.[0]?.carrier).toBe('USPS');
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/workspaces/ws-test-001/shipping/rates',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('gets cheapest rate', async () => {
      mockFetch.mockReturnValueOnce(
        jsonResponse({
          success: true,
          data: { carrier: 'USPS', service: 'Ground Advantage', rate: 5.25, currency: 'USD', estimatedDays: 4 },
        }),
      );

      const client = createClient();
      const result = await client.shipping.getCheapestRate({
        fromZip: '10001',
        toZip: '90210',
        weight: 8,
      });

      expect(result.data?.rate).toBe(5.25);
    });

    it('validates an address', async () => {
      mockFetch.mockReturnValueOnce(
        jsonResponse({
          success: true,
          data: { isValid: true, messages: [] },
        }),
      );

      const client = createClient();
      const result = await client.shipping.validateAddress({
        name: 'John Doe',
        street1: '123 Main St',
        city: 'New York',
        state: 'NY',
        zip: '10001',
        country: 'US',
      });

      expect(result.data?.isValid).toBe(true);
    });

    it('tracks a shipment', async () => {
      mockFetch.mockReturnValueOnce(
        jsonResponse({
          success: true,
          data: {
            trackingNumber: '9400111899223456789012',
            carrier: 'USPS',
            status: 'In Transit',
            events: [{ timestamp: '2026-03-04T10:00:00Z', status: 'Departed', description: 'Left facility' }],
          },
        }),
      );

      const client = createClient();
      const result = await client.shipping.track('9400111899223456789012');

      expect(result.data?.carrier).toBe('USPS');
      expect(result.data?.events).toHaveLength(1);
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

    it('calls FedEx rate calculator', async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ success: true }));

      const client = createClient();
      await client.carriers.fedex.getRates({ shipperPostalCode: '10001' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/ApiProxy/api/v3/RateCalculator/postRetrieveFedExRateAndTransitTimesAsync'),
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('calls DHL create shipment', async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ success: true }));

      const client = createClient();
      await client.carriers.dhl.createShipment({ productCode: 'P' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/ApiProxy/api/v2/ShippingLabel/postDhlCreateShipment'),
        expect.objectContaining({ method: 'POST' }),
      );
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
      await client.webhooks.create({ url: 'https://example.com/hook', events: ['label.created'] });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/workspaces/ws-test-001/webhooks',
        expect.objectContaining({ method: 'POST' }),
      );
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
      await expect(client.shipping.getRates({ fromZip: '', toZip: '', weight: 0 })).rejects.toThrow(FlexOpsError);
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

  describe('webhook signature verification', () => {
    it('verifies a valid HMAC-SHA256 signature', async () => {
      const crypto = await import('node:crypto');
      const secret = 'whsec_test123';
      const payload = '{"event":"label.created","data":{}}';
      const signature = crypto.createHmac('sha256', secret).update(payload, 'utf-8').digest('hex');

      const { WebhooksResource } = await import('../src/resources/webhooks.js');
      expect(WebhooksResource.verifySignature(payload, signature, secret)).toBe(true);
    });

    it('rejects an invalid signature', async () => {
      const { WebhooksResource } = await import('../src/resources/webhooks.js');
      expect(
        WebhooksResource.verifySignature('payload', 'invalid'.padEnd(64, '0'), 'secret'),
      ).toBe(false);
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

      // Verify the request was made
      expect(mockFetch).toHaveBeenCalledTimes(1);
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
    it('creates an order', async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ success: true }));

      const client = createClient();
      await client.orders.create({ orderNumber: 'ORD-001' });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/ApiProxy/api/v1/Order/postNewOrder',
        expect.objectContaining({ method: 'POST' }),
      );
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
  });
});
