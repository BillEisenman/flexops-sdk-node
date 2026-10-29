// Contract test: every public SDK method calls an operation in the documented Gateway OpenAPI.
//
// tests/fixtures/gateway-operations.json is the "METHOD /path" list of the Developer Docs snapshot
// (FlexOpsDeveloperDocs static/openapi/gateway.json). Refresh it by regenerating that list from the
// current snapshot when the Gateway's documented surface changes.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  FlexOps,
  HazmatClassification,
  RecurrenceInterval,
  ReportFormat,
  ReportFrequency,
  TrackingEmailEvent,
  WebhookEventType,
  WorkspaceRole,
} from '../src/index.js';

const operations: string[] = JSON.parse(
  readFileSync(new URL('./fixtures/gateway-operations.json', import.meta.url), 'utf8'),
).operations;

const documented = operations.map(op => {
  const [method, path] = op.split(' ');
  const pattern = path
    .replace(/^\/api\/v1\//i, '/api/')
    .split('/')
    .map(s => (s.startsWith('{') ? '[^/]+' : s.replace(/[.*+?^$()|[\]\\]/g, '\\$&')))
    .join('/');
  return { method, regex: new RegExp(`^${pattern}$`, 'i') };
});

/**
 * The only methods allowed to write through the legacy proxy: deprecated, user-token only (the Gateway
 * refuses API-key writes there) and gone when the proxy is retired on 2027-06-30.
 */
const DEPRECATED_PROXY_WRITES = new Set([
  'carriers.usps.getDomesticRates',
  'carriers.usps.getDomesticProducts',
  'carriers.usps.getDomesticPrices',
  'carriers.usps.getInternationalRates',
  'carriers.usps.getInternationalPrices',
  'carriers.usps.cancelDomesticLabel',
  'carriers.usps.cancelInternationalLabel',
  'carriers.usps.createPickup',
  'carriers.usps.cancelPickup',
  'carriers.usps.createScanForm',
  'carriers.ups.validateAddress',
  'carriers.ups.getRates',
  'carriers.ups.createPickup',
  'carriers.ups.cancelPickup',
  'carriers.ups.getTransitTimes',
  'carriers.ups.getLandedCost',
  'carriers.ups.searchLocations',
  'carriers.ups.uploadDocument',
  'carriers.ups.createFreightShipment',
  'carriers.ups.getFreightRate',
  'carriers.fedex.validateAddress',
  'carriers.fedex.validatePostalCode',
  'carriers.fedex.getRates',
  'carriers.fedex.cancelShipment',
  'carriers.fedex.validateShipment',
  'carriers.fedex.track',
  'carriers.fedex.trackMultiPiece',
  'carriers.fedex.registerTrackingNotification',
  'carriers.fedex.createPickup',
  'carriers.fedex.cancelPickup',
  'carriers.fedex.searchLocations',
  'carriers.fedex.getServiceStandards',
  'carriers.fedex.getFreightRate',
  'carriers.fedex.createFreightShipment',
  'carriers.fedex.groundClose',
  'carriers.fedex.uploadTradeDocuments',
  'carriers.fedex.createOpenShipment',
  'carriers.fedex.addPackagesToOpenShipment',
  'carriers.fedex.confirmOpenShipment',
  'carriers.dhl.getMultiPieceRates',
  'carriers.dhl.createPickup',
  'carriers.dhl.cancelPickup',
  'carriers.dhl.calculateLandedCost',
  'carriers.dhl.screenShipment',
  'carriers.dhl.uploadInvoice',
]);

/** Label purchases the Gateway closes on the proxy (410 Gone); the SDK must never call them. */
const CLOSED_LABEL_SUFFIXES = [
  'generateNewUpsShipLabel', 'postNewShipLabelOrder', 'postUspsGenerateDomesticShippingLabel',
  'postUspsGenerateDomesticReturnsShippingLabel', 'postUspsGenerateInternationalShippingLabel',
  'postUspsGenerateDomesticIndiciaLabel', 'postFedExCreateNewShipment', 'postFedExCreateNewReturnShipment',
  'postDhlCreateShipment', 'postOnTracCreateShipment', 'postLsoCreateShipment', 'postAusPostCreateShipment',
  'postCanadaPostCreateShipment', 'postRoyalMailCreateShipment',
].map(s => s.toLowerCase());

/** Methods that build paths or hold state; they are not API calls. */
const HELPERS = new Set(['constructor', 'wsPath', 'path', 'proxy']);

const address = { addressLine1: '1 Main St', city: 'New York', stateProvince: 'NY', postalCode: '10001' };
const rate = { origin: address, destination: address, package: { weight: 16, weightUnit: 'oz' as const } };
const label = { ...rate, carrierCode: 'USPS', serviceCode: 'PRIORITY', hazmatClassification: HazmatClassification.None };
const batch = { labels: [label] } as never;

type Call = (c: FlexOps) => Promise<unknown>;

const scenarios: Record<string, Call> = {
  'auth.login': c => c.auth.login({ email: 'a@b.c', password: 'x' }),
  'auth.refreshToken': c => c.auth.refreshToken('r', 'expired-jwt'),
  'auth.logout': c => c.auth.logout(),
  'workspaces.list': c => c.workspaces.list(),
  'workspaces.get': c => c.workspaces.get(),
  'workspaces.listMembers': c => c.workspaces.listMembers(),
  'workspaces.inviteMember': c => c.workspaces.inviteMember('a@b.c', WorkspaceRole.Admin),
  'workspaces.removeMember': c => c.workspaces.removeMember('u1'),
  'workspaces.updateMemberRole': c => c.workspaces.updateMemberRole('u1', WorkspaceRole.Member),
  'shipping.getRates': c => c.shipping.getRates(rate),
  'shipping.getCheapestRate': c => c.shipping.getCheapestRate(rate),
  'shipping.getFastestRate': c => c.shipping.getFastestRate(rate),
  'shipping.createLabel': c => c.shipping.createLabel(label),
  'shipping.prepareLabel': c => c.shipping.prepareLabel(label, 25, 'key-1'),
  'shipping.purchaseLabel': c => c.shipping.purchaseLabel({ idempotencyKey: 'key-1', requestJson: JSON.stringify(label), preview: null } as never),
  'shipping.cancelLabel': c => c.shipping.cancelLabel('lbl-1', 'usps'),
  'shipping.track': c => c.shipping.track('9400'),
  'shipping.validateAddress': c => c.shipping.validateAddress(address),
  'shipping.createBatch': c => c.shipping.createBatch(batch),
  'shipping.previewBatch': c => c.shipping.previewBatch(batch),
  'shipping.createMultiPackage': c => c.shipping.createMultiPackage({ orderId: 1, carrierCode: 'USPS', packages: [{ weightInOunces: 16, lengthInInches: 10, widthInInches: 8, heightInInches: 4 }] }),
  'shipping.getBatchStatus': c => c.shipping.getBatchStatus('job-1'),
  'shipping.downloadBatchLabel': c => c.shipping.downloadBatchLabel('job-1', 'item-1'),
  'shipping.getCarriers': c => c.shipping.getCarriers(),
  'shipping.getRecommendations': c => c.shipping.getRecommendations({} as never),
  'shipping.predictDelivery': c => c.shipping.predictDelivery({} as never),
  'shipping.getSavings': c => c.shipping.getSavings(),
  'carriers.usps.validateAddress': c => c.carriers.usps.validateAddress({ zipCode: '10001' }),
  'carriers.usps.cityStateLookup': c => c.carriers.usps.cityStateLookup('10001'),
  'carriers.usps.zipCodeLookup': c => c.carriers.usps.zipCodeLookup({ city: 'NY' }),
  'carriers.usps.createDomesticLabel': c => c.carriers.usps.createDomesticLabel(label),
  'carriers.usps.trackSummary': c => c.carriers.usps.trackSummary({ trackingNumber: '9400' }),
  'carriers.usps.trackDetail': c => c.carriers.usps.trackDetail({ trackingNumber: '9400' }),
  'carriers.usps.deliveryStandards': c => c.carriers.usps.deliveryStandards({ originZip: '10001' }),
  'carriers.usps.findDropOffLocations': c => c.carriers.usps.findDropOffLocations({ zip: '10001' }),
  'carriers.usps.findPostOffices': c => c.carriers.usps.findPostOffices({ zip: '10001' }),
  'carriers.ups.track': c => c.carriers.ups.track({ trackingNumber: '1Z' }),
  'carriers.dhl.validateAddress': c => c.carriers.dhl.validateAddress({ postalCode: '10001' }),
  'carriers.dhl.getRates': c => c.carriers.dhl.getRates({ originPostalCode: '10001' }),
  'carriers.dhl.getProducts': c => c.carriers.dhl.getProducts({ originPostalCode: '10001' }),
  'carriers.dhl.track': c => c.carriers.dhl.track({ trackingNumber: '1' }),
  'carriers.dhl.trackMultiple': c => c.carriers.dhl.trackMultiple({ trackingNumbers: '1,2' }),
  'carriers.dhl.getProofOfDelivery': c => c.carriers.dhl.getProofOfDelivery({ trackingNumber: '1' }),
  'carriers.dhl.getReferenceData': c => c.carriers.dhl.getReferenceData({ type: 'countries' }),
  'carriers.dhl.findServicePoints': c => c.carriers.dhl.findServicePoints({ postalCode: '10001' }),
  'webhooks.list': c => c.webhooks.list(),
  'webhooks.create': c => c.webhooks.create({ url: 'https://e.x/h', events: [WebhookEventType.LabelCreated] }),
  'webhooks.update': c => c.webhooks.update('wh-1', { url: 'https://e.x/h' }),
  'webhooks.delete': c => c.webhooks.delete('wh-1'),
  'webhooks.rotateSecret': c => c.webhooks.rotateSecret('wh-1'),
  'webhooks.listDeliveryLogs': c => c.webhooks.listDeliveryLogs('wh-1'),
  'webhooks.test': c => c.webhooks.test('wh-1'),
  'wallet.getBalance': c => c.wallet.getBalance(),
  'insurance.getProviders': c => c.insurance.getProviders(),
  'insurance.getQuote': c => c.insurance.getQuote({ declaredValue: 100, carrierCode: 'usps' }),
  'insurance.purchase': c => c.insurance.purchase({ trackingNumber: '9400', carrierCode: 'usps', declaredValue: 100 }),
  'insurance.void': c => c.insurance.void('pol-1'),
  'insurance.fileClaim': c => c.insurance.fileClaim({ policyId: 'pol-1', claimReason: 'Lost', claimAmount: 10 }),
  'returns.list': c => c.returns.list(),
  'returns.get': c => c.returns.get(42),
  'returns.listRmas': c => c.returns.listRmas(),
  'returns.getRma': c => c.returns.getRma('RMA-1'),
  'returns.create': c => c.returns.create({ orderId: 1, reason: 'Damaged', items: [{ sku: 'S', quantity: 1 }] }),
  'returns.generateLabel': c => c.returns.generateLabel('RMA-1'),
  'returns.markReceived': c => c.returns.markReceived(7, { rmaNumber: 'RMA-1', warehouseId: 1, inspectedItems: [] }),
  'analytics.shipmentsTrend': c => c.analytics.shipmentsTrend(),
  'analytics.carrierSummary': c => c.analytics.carrierSummary(),
  'analytics.topDestinations': c => c.analytics.topDestinations(),
  'analytics.inventoryMetrics': c => c.analytics.inventoryMetrics(),
  'analytics.stockByWarehouse': c => c.analytics.stockByWarehouse(),
  'analytics.orderMetrics': c => c.analytics.orderMetrics(),
  'analytics.orderTrend': c => c.analytics.orderTrend(),
  'analytics.topSellingProducts': c => c.analytics.topSellingProducts(),
  'analytics.returnsMetrics': c => c.analytics.returnsMetrics(),
  'analytics.returnsTrend': c => c.analytics.returnsTrend(),
  'analytics.returnReasons': c => c.analytics.returnReasons(),
  'analytics.performanceMetrics': c => c.analytics.performanceMetrics(),
  'analytics.carrierPerformance': c => c.analytics.carrierPerformance(),
  'analytics.shippingCostAnalytics': c => c.analytics.shippingCostAnalytics(),
  'analytics.deliveryPerformance': c => c.analytics.deliveryPerformance(),
  'orders.getNewOrders': c => c.orders.getNewOrders(),
  'orders.getByStatus': c => c.orders.getByStatus(),
  'orders.getDetails': c => c.orders.getDetails('O-1'),
  'orders.getExtendedDetails': c => c.orders.getExtendedDetails('O-1'),
  'orders.getStatus': c => c.orders.getStatus('O-1'),
  'orders.getItems': c => c.orders.getItems('O-1'),
  'orders.getShipMethods': c => c.orders.getShipMethods(),
  'orders.getWarehouses': c => c.orders.getWarehouses(),
  'orders.getCountryCodes': c => c.orders.getCountryCodes(),
  'orders.getStatusTypes': c => c.orders.getStatusTypes(),
  'inventory.getWarehouseSnapshot': c => c.inventory.getWarehouseSnapshot(),
  'inventory.getCompleteSnapshot': c => c.inventory.getCompleteSnapshot(),
  'inventory.getPartNumbers': c => c.inventory.getPartNumbers(),
  'pickups.schedule': c => c.pickups.schedule({ carrierCode: 'usps', pickupDate: '2026-10-20', street: '1 Main', city: 'NY', state: 'NY', postalCode: '10001', packageCount: 1 }),
  'pickups.list': c => c.pickups.list(),
  'pickups.get': c => c.pickups.get('p-1'),
  'pickups.cancel': c => c.pickups.cancel('p-1'),
  'scanForms.create': c => c.scanForms.create({ trackingNumbers: ['9400'] } as never),
  'scanForms.list': c => c.scanForms.list(),
  'scanForms.get': c => c.scanForms.get('sf-1'),
  'rules.list': c => c.rules.list(),
  'rules.get': c => c.rules.get('r-1'),
  'rules.create': c => c.rules.create({ name: 'R', priority: 0, isEnabled: true, conditions: [], actions: [] }),
  'rules.update': c => c.rules.update('r-1', { name: 'R', priority: 0, isEnabled: true, conditions: [], actions: [] }),
  'rules.delete': c => c.rules.delete('r-1'),
  'rules.reorder': c => c.rules.reorder(['r-1', 'r-2']),
  'rules.test': c => c.rules.test({ weightOz: 16, declaredValue: 10, destinationCountry: 'US', itemCount: 1 }),
  'carbonOffsets.quote': c => c.carbonOffsets.quote({ weightLbs: 1, distanceMiles: 100 }),
  'carbonOffsets.purchase': c => c.carbonOffsets.purchase({ trackingNumber: '9400', weightLbs: 1, distanceMiles: 100 }),
  'carbonOffsets.list': c => c.carbonOffsets.list(),
  'carbonOffsets.get': c => c.carbonOffsets.get('o-1'),
  'carbonOffsets.getSummary': c => c.carbonOffsets.getSummary(),
  'carbonOffsets.getSettings': c => c.carbonOffsets.getSettings(),
  'carbonOffsets.updateSettings': c => c.carbonOffsets.updateSettings({ autoOffsetEnabled: true }),
  'hsCodes.search': c => c.hsCodes.search('shoes'),
  'hsCodes.lookup': c => c.hsCodes.lookup('6403'),
  'hsCodes.estimateLandedCost': c => c.hsCodes.estimateLandedCost({ destinationCountry: 'CA', items: [] }),
  'recurringShipments.list': c => c.recurringShipments.list(),
  'recurringShipments.get': c => c.recurringShipments.get('r-1'),
  'recurringShipments.create': c => c.recurringShipments.create({ name: 'Weekly', interval: RecurrenceInterval.Weekly, firstRunUtc: '2026-11-01T15:00:00Z' }),
  'recurringShipments.update': c => c.recurringShipments.update('r-1', { name: 'Daily' }),
  'recurringShipments.delete': c => c.recurringShipments.delete('r-1'),
  'recurringShipments.pause': c => c.recurringShipments.pause('r-1'),
  'recurringShipments.resume': c => c.recurringShipments.resume('r-1'),
  'recurringShipments.trigger': c => c.recurringShipments.trigger('r-1', 'key-1'),
  'reportSchedules.list': c => c.reportSchedules.list(),
  'reportSchedules.get': c => c.reportSchedules.get('s-1'),
  'reportSchedules.create': c => c.reportSchedules.create({
    reportType: 'shipments', format: ReportFormat.Csv, frequencyType: ReportFrequency.Daily, timeOfDayUtc: '08:00:00', recipientEmails: 'a@b.c',
  }),
  'reportSchedules.update': c => c.reportSchedules.update('s-1', { recipientEmails: 'a@b.c' }),
  'reportSchedules.delete': c => c.reportSchedules.delete('s-1'),
  'reportSchedules.toggle': c => c.reportSchedules.toggle('s-1'),
  'emailTemplates.list': c => c.emailTemplates.list(),
  'emailTemplates.get': c => c.emailTemplates.get('t-1'),
  'emailTemplates.upsert': c => c.emailTemplates.upsert({ eventType: TrackingEmailEvent.Delivered, subjectTemplate: 's', htmlBodyTemplate: 'b' }),
  'emailTemplates.delete': c => c.emailTemplates.delete('t-1'),
  'emailTemplates.preview': c => c.emailTemplates.preview({ subjectTemplate: 's', htmlBodyTemplate: 'b' }),
};

// Every deprecated proxy write takes at most one opaque body.
for (const name of DEPRECATED_PROXY_WRITES) {
  const [, group, method] = name.split('.');
  scenarios[name] = c => (c.carriers as unknown as Record<string, Record<string, (body?: unknown) => Promise<unknown>>>)[group][method]({});
}
// ...except the USPS cancels, which name what they cancel.
scenarios['carriers.usps.cancelDomesticLabel'] = c => c.carriers.usps.cancelDomesticLabel('9400111899223456789012');
scenarios['carriers.usps.cancelInternationalLabel'] = c => c.carriers.usps.cancelInternationalLabel('LZ123456789US');
scenarios['carriers.usps.cancelPickup'] = c => c.carriers.usps.cancelPickup('WTC123');

/** Every public API method on a client, as `resource.method` or `resource.group.method`. */
function publicMethods(client: FlexOps): string[] {
  const names: string[] = [];
  for (const [resource, value] of Object.entries(client)) {
    if (typeof value !== 'object' || value === null || !value.constructor.name.endsWith('Resource')) continue;
    for (const name of Object.getOwnPropertyNames(Object.getPrototypeOf(value)))
      if (!HELPERS.has(name)) names.push(`${resource}.${name}`);
    for (const [group, members] of Object.entries(value))
      if (group !== 'http' && typeof members === 'object' && members !== null)
        for (const [name, fn] of Object.entries(members)) if (typeof fn === 'function') names.push(`${resource}.${group}.${name}`);
  }
  return names.sort();
}

/** One body that satisfies every method's client-side result checks. */
const universal = {
  success: true,
  data: { id: 'x' },
  isSandbox: true,
  trackingNumber: '9400',
  rates: [{ carrier: 'USPS', service: 'P', totalCost: 1, estimatedDays: 1 }],
  currency: 'USD',
};

describe('Gateway contract', () => {
  it('exercises every public method', () => {
    const methods = publicMethods(new FlexOps({ fetch: (() => {}) as never }));
    expect(methods.filter(m => !(m in scenarios)), 'methods without a scenario').toEqual([]);
    expect(Object.keys(scenarios).filter(s => !methods.includes(s)), 'scenarios without a method').toEqual([]);
  });

  it.each(Object.entries(scenarios))('%s calls a documented operation', async (name, call) => {
    const calls = await record(call);

    expect(calls.length).toBeGreaterThan(0);
    for (const { method, path } of calls) {
      const normalized = path.replace(/^\/api\/v1\//i, '/api/');
      if (/^\/api\/apiproxy\//i.test(normalized)) {
        // The proxy refuses API-key writes and is being retired: only the deprecated methods write
        // through it, never a PATCH (it has no PATCH route) and never a closed label purchase.
        if (method !== 'GET') expect(DEPRECATED_PROXY_WRITES.has(name), `${name}: ${method} ${path}`).toBe(true);
        expect(method).not.toBe('PATCH');
        expect(CLOSED_LABEL_SUFFIXES.some(s => normalized.toLowerCase().endsWith(s)), `${method} ${path}`).toBe(false);
        continue;
      }
      expect(documented.some(op => op.method === method && op.regex.test(normalized)), `${method} ${path}`).toBe(true);
    }
  });

  it('allows proxy writes from exactly the deprecated methods', async () => {
    const writers: string[] = [];
    for (const [name, call] of Object.entries(scenarios)) {
      const calls = await record(call);
      if (calls.some(c => c.method !== 'GET' && /^\/api\/(v1\/)?apiproxy\//i.test(c.path))) writers.push(name);
    }

    expect(writers.sort()).toEqual([...DEPRECATED_PROXY_WRITES].sort());
  });

  it('marks every proxy write @deprecated in the source', () => {
    const source = readFileSync(new URL('../src/resources/carriers.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
    for (const name of DEPRECATED_PROXY_WRITES) {
      const [, group, method] = name.split('.');
      const block = source.slice(source.indexOf(`readonly ${group} = {`));
      const entry = new RegExp(`/\\*\\*((?:(?!\\*/)[\\s\\S])*)\\*/\\n(?:\\s*//[^\\n]*\\n)*\\s*${method}: \\(`).exec(block);
      expect(entry?.[1], name).toContain('@deprecated');
    }
  });
});

async function record(call: Call): Promise<{ method: string; path: string }[]> {
  const calls: { method: string; path: string }[] = [];
  const fetch = async (url: string, init: RequestInit) => {
    calls.push({ method: init.method ?? 'GET', path: new URL(url).pathname });
    return new Response(JSON.stringify(universal), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  const client = new FlexOps({ baseUrl: 'http://gateway.test', apiKey: 'test_x', workspaceId: 'ws-1', fetch: fetch as never });
  await call(client).catch(() => undefined);
  return calls;
}
