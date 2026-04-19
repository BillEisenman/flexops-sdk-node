// ***********************************************************************
// Package          : @flexops/sdk
// Author           : FlexOps, LLC
// Created          : 2026-03-04
//
// Copyright (c) 2021-2026 by FlexOps, LLC. All rights reserved.
// ***********************************************************************

import type { FlexOpsConfig } from './types.js';
import { HttpClient } from './http.js';
import { AuthResource } from './resources/auth.js';
import { WorkspacesResource } from './resources/workspaces.js';
import { ShippingResource } from './resources/shipping.js';
import { CarriersResource } from './resources/carriers.js';
import { WebhooksResource } from './resources/webhooks.js';
import { WalletResource } from './resources/wallet.js';
import { InsuranceResource } from './resources/insurance.js';
import { ReturnsResource } from './resources/returns.js';
import { ApiKeysResource } from './resources/api-keys.js';
import { AnalyticsResource } from './resources/analytics.js';
import { OrdersResource } from './resources/orders.js';
import { InventoryResource } from './resources/inventory.js';
import { PickupsResource } from './resources/pickups.js';
import { ScanFormsResource } from './resources/scan-forms.js';
import { RulesResource } from './resources/rules.js';
import { OffsetResource } from './resources/offsets.js';
import { HsCodesResource } from './resources/hs-codes.js';
import { RecurringShipmentsResource } from './resources/recurring-shipments.js';
import { EmailTemplatesResource } from './resources/email-templates.js';
import { ReportsResource } from './resources/reports.js';

/**
 * FlexOps Platform SDK Client
 *
 * The main entry point for interacting with the FlexOps multi-carrier
 * shipping platform API.
 *
 * @example Authentication with API key (recommended for server-to-server)
 * ```typescript
 * import { FlexOps } from '@flexops/sdk';
 *
 * const client = new FlexOps({
 *   apiKey: 'fxk_live_...',
 *   workspaceId: 'ws_abc123',
 * });
 *
 * // Get shipping rates
 * const rates = await client.shipping.getRates({
 *   fromZip: '10001',
 *   toZip: '90210',
 *   weight: 16,
 *   weightUnit: 'oz',
 * });
 *
 * // Create a label with the cheapest rate
 * const label = await client.shipping.createLabel({
 *   carrier: rates.data[0].carrier,
 *   service: rates.data[0].service,
 *   fromAddress: { ... },
 *   toAddress: { ... },
 *   parcel: { weight: 16, weightUnit: 'oz' },
 * });
 * ```
 *
 * @example Authentication with email/password
 * ```typescript
 * const client = new FlexOps({ baseUrl: 'https://gateway.flexops.io' });
 * await client.auth.login({ email: 'user@co.com', password: '...' });
 * // Token is automatically stored and used for subsequent requests
 * ```
 *
 * @example Direct carrier operations
 * ```typescript
 * // USPS domestic label (full carrier-specific payload)
 * const uspsLabel = await client.carriers.usps.createDomesticLabel({
 *   imageType: 'PDF',
 *   mailClass: 'PRIORITY_MAIL',
 *   weightInOunces: 16,
 *   // ... full USPS payload
 * });
 *
 * // FedEx rate quote
 * const fedexRates = await client.carriers.fedex.getRates({
 *   // ... full FedEx payload
 * });
 * ```
 */
export class FlexOps {
  private readonly http: HttpClient;
  private _workspaceId?: string;

  // Domain resources
  readonly auth: AuthResource;
  readonly workspaces: WorkspacesResource;
  readonly shipping: ShippingResource;
  readonly carriers: CarriersResource;
  readonly webhooks: WebhooksResource;
  readonly wallet: WalletResource;
  readonly insurance: InsuranceResource;
  readonly returns: ReturnsResource;
  readonly apiKeys: ApiKeysResource;
  readonly analytics: AnalyticsResource;
  readonly orders: OrdersResource;
  readonly inventory: InventoryResource;
  readonly pickups: PickupsResource;
  readonly scanForms: ScanFormsResource;
  readonly rules: RulesResource;
  readonly offsets: OffsetResource;
  readonly hsCodes: HsCodesResource;
  readonly recurringShipments: RecurringShipmentsResource;
  readonly emailTemplates: EmailTemplatesResource;
  readonly reports: ReportsResource;

  constructor(config: FlexOpsConfig = {}) {
    this.http = new HttpClient(config);
    this._workspaceId = config.workspaceId;

    const getWsId = () => this._workspaceId;

    this.auth = new AuthResource(this.http);
    this.workspaces = new WorkspacesResource(this.http, getWsId);
    this.shipping = new ShippingResource(this.http, getWsId);
    this.carriers = new CarriersResource(this.http);
    this.webhooks = new WebhooksResource(this.http, getWsId);
    this.wallet = new WalletResource(this.http, getWsId);
    this.insurance = new InsuranceResource(this.http, getWsId);
    this.returns = new ReturnsResource(this.http, getWsId);
    this.apiKeys = new ApiKeysResource(this.http, getWsId);
    this.analytics = new AnalyticsResource(this.http);
    this.orders = new OrdersResource(this.http);
    this.inventory = new InventoryResource(this.http);
    this.pickups = new PickupsResource(this.http, getWsId);
    this.scanForms = new ScanFormsResource(this.http, getWsId);
    this.rules = new RulesResource(this.http, getWsId);
    this.offsets = new OffsetResource(this.http, getWsId);
    this.hsCodes = new HsCodesResource(this.http, getWsId);
    this.recurringShipments = new RecurringShipmentsResource(this.http, getWsId);
    this.emailTemplates = new EmailTemplatesResource(this.http, getWsId);
    this.reports = new ReportsResource(this.http, getWsId);
  }

  /** Get or set the active workspace ID. */
  get workspaceId(): string | undefined {
    return this._workspaceId;
  }
  set workspaceId(id: string | undefined) {
    this._workspaceId = id;
  }

  /** Set the JWT access token for authentication. */
  setAccessToken(token: string): void {
    this.http.setAccessToken(token);
  }

  /** Set the API key for authentication. */
  setApiKey(key: string): void {
    this.http.setApiKey(key);
  }
}
