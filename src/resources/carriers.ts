// ***********************************************************************
// Package          : @flexops/sdk
// Author           : FlexOps, LLC
// Created          : 2026-03-04
//
// Copyright (c) 2021-2026 by FlexOps, LLC. All rights reserved.
// ***********************************************************************

import type { HttpClient } from '../http.js';
import { ShippingResource } from './shipping.js';
import type { CanonicalLabelRequest, Label } from '../types.js';

/**
 * Direct carrier operations via the VisionSuite Core Services API proxy.
 *
 * Pass-throughs to carrier-specific endpoints (USPS, UPS, FedEx, DHL) via the Gateway's legacy
 * ApiProxy route, deprecated and sunset on 2027-06-30. The GET lookups work with API keys that
 * have the permission for the data they read: address, ZIP, city, location, service point and
 * reference lookups require `shipping:read`; tracking and proof of delivery require
 * `tracking:read`; delivery standards, rates and products require `rates:read`. A key without the
 * permission gets 403 `API_KEY_SCOPE_REQUIRED`; keys created with the default permissions have all
 * three. The writes are marked deprecated: they need a user token (`auth.login`), because the Gateway refuses
 * API-key writes on the proxy with 403 `API_KEY_SCOPE_REQUIRED`. Label purchases through the proxy are
 * closed (410); rates, labels, voids, pickups and scan forms go through `client.shipping`,
 * `client.pickups` and `client.scanForms` for every carrier.
 */
export class CarriersResource {
  constructor(private readonly http: HttpClient) {}

  private proxy(path: string): string {
    return `/api/ApiProxy/${path.replace(/^\//, '')}`;
  }

  // -----------------------------------------------------------------------
  // USPS (V3 endpoints)
  // -----------------------------------------------------------------------

  readonly usps = {
    /** Validate and correct a US address via USPS. */
    validateAddress: (params: Record<string, string>) =>
      this.http.get(this.proxy('api/v3/AddressValidation/getUspsValidateAndCorrectAddress'), params),

    /** City/State lookup by ZIP code. */
    cityStateLookup: (zipCode: string) =>
      this.http.get(this.proxy('api/v3/AddressValidation/getUspsCityStateLookupByZipCode'), { zipCode }),

    /** ZIP code lookup by address. */
    zipCodeLookup: (params: Record<string, string>) =>
      this.http.get(this.proxy('api/v3/AddressValidation/getUspsZipCodeLookupByAddress'), params),

    /**
     * Search domestic shipping rates.
     *
     * @deprecated Legacy carrier proxy (sunset 2027-06-30). Needs a user token: API keys get 403
     *   `API_KEY_SCOPE_REQUIRED`. Use `client.shipping` / `client.pickups` / `client.scanForms` where they
     *   cover this.
     */
    getDomesticRates: (body: unknown) =>
      this.http.post(this.proxy('api/v3/RateCalculator/postUspsSearchDomesticBaseRates'), body),

    /**
     * Search domestic product eligibility.
     *
     * @deprecated Legacy carrier proxy (sunset 2027-06-30). Needs a user token: API keys get 403
     *   `API_KEY_SCOPE_REQUIRED`. Use `client.shipping` / `client.pickups` / `client.scanForms` where they
     *   cover this.
     */
    getDomesticProducts: (body: unknown) =>
      this.http.post(this.proxy('api/v3/RateCalculator/postUspsSearchEligibleDomesticProducts'), body),

    /**
     * Search domestic prices.
     *
     * @deprecated Legacy carrier proxy (sunset 2027-06-30). Needs a user token: API keys get 403
     *   `API_KEY_SCOPE_REQUIRED`. Use `client.shipping` / `client.pickups` / `client.scanForms` where they
     *   cover this.
     */
    getDomesticPrices: (body: unknown) =>
      this.http.post(this.proxy('api/v3/RateCalculator/postUspsSearchEligibleDomesticPrices'), body),

    /**
     * Search international rates.
     *
     * @deprecated Legacy carrier proxy (sunset 2027-06-30). Needs a user token: API keys get 403
     *   `API_KEY_SCOPE_REQUIRED`. Use `client.shipping` / `client.pickups` / `client.scanForms` where they
     *   cover this.
     */
    getInternationalRates: (body: unknown) =>
      this.http.post(this.proxy('api/v3/RateCalculator/postUspsSearchInternationalBaseRates'), body),

    /**
     * Search international prices.
     *
     * @deprecated Legacy carrier proxy (sunset 2027-06-30). Needs a user token: API keys get 403
     *   `API_KEY_SCOPE_REQUIRED`. Use `client.shipping` / `client.pickups` / `client.scanForms` where they
     *   cover this.
     */
    getInternationalPrices: (body: unknown) =>
      this.http.post(this.proxy('api/v3/RateCalculator/postUspsSearchEligibleInternationalPrices'), body),

    /** Generate a domestic shipping label. */
    // Domestic USPS labels go through the reliable order-based Gateway path
    // (POST /api/shipping/labels): pass a LabelRequest body with carrierCode:'USPS'
    // and orderId set — server-side order validation + atomic postage settlement.
    createDomesticLabel: (body: unknown): Promise<Label> =>
      new ShippingResource(this.http, () => undefined).createLabel(body as CanonicalLabelRequest),

    /**
     * Cancel a domestic label.
     *
     * @deprecated Legacy carrier proxy (sunset 2027-06-30). Needs a user token: API keys get 403
     *   `API_KEY_SCOPE_REQUIRED`. Use `client.shipping` / `client.pickups` / `client.scanForms` where they
     *   cover this.
     */
    cancelDomesticLabel: () =>
      this.http.delete(this.proxy('api/v3/Shipping/cancelUspsDomesticShipmentLabel')),

    /**
     * Cancel an international label.
     *
     * @deprecated Legacy carrier proxy (sunset 2027-06-30). Needs a user token: API keys get 403
     *   `API_KEY_SCOPE_REQUIRED`. Use `client.shipping` / `client.pickups` / `client.scanForms` where they
     *   cover this.
     */
    cancelInternationalLabel: () =>
      this.http.delete(this.proxy('api/v3/Shipping/cancelUspsInternationalShipmentLabel')),

    /** Get tracking summary. */
    trackSummary: (params: Record<string, string>) =>
      this.http.get(this.proxy('api/v3/Tracking/getUspsTrackingSummaryInformation'), params),

    /** Get detailed tracking info. */
    trackDetail: (params: Record<string, string>) =>
      this.http.get(this.proxy('api/v3/Tracking/getUspsTrackingDetailInformation'), params),

    /**
     * Schedule a carrier pickup.
     *
     * @deprecated Legacy carrier proxy (sunset 2027-06-30). Needs a user token: API keys get 403
     *   `API_KEY_SCOPE_REQUIRED`. Use `client.shipping` / `client.pickups` / `client.scanForms` where they
     *   cover this.
     */
    createPickup: (body: unknown) =>
      this.http.post(this.proxy('api/v3/CarrierPickup/postUspsCreateCarrierPickupSchedule'), body),

    /**
     * Cancel a pickup.
     *
     * @deprecated Legacy carrier proxy (sunset 2027-06-30). Needs a user token: API keys get 403
     *   `API_KEY_SCOPE_REQUIRED`. Use `client.shipping` / `client.pickups` / `client.scanForms` where they
     *   cover this.
     */
    cancelPickup: () =>
      this.http.delete(this.proxy('api/v3/CarrierPickup/cancelUspsCarrierPickupSchedule')),

    /**
     * Create a scan form.
     *
     * @deprecated Legacy carrier proxy (sunset 2027-06-30). Needs a user token: API keys get 403
     *   `API_KEY_SCOPE_REQUIRED`. Use `client.shipping` / `client.pickups` / `client.scanForms` where they
     *   cover this.
     */
    createScanForm: (body: unknown) =>
      this.http.post(this.proxy('api/v3/ScanForm/postUspsCreateScanFormLabelShipment'), body),

    /** Get delivery standards estimates. */
    deliveryStandards: (params: Record<string, string>) =>
      this.http.get(this.proxy('api/v3/ServiceStandards/getUspsGetDeliveryStandardsEstimates'), params),

    /** Find drop-off locations. */
    findDropOffLocations: (params: Record<string, string>) =>
      this.http.get(this.proxy('api/v3/LocationSearch/getUspsFindValidDropOffLocations'), params),

    /** Find post office locations. */
    findPostOffices: (params: Record<string, string>) =>
      this.http.get(this.proxy('api/v3/LocationSearch/getUspsFindValidPostOfficeLocations'), params),
  };

  // -----------------------------------------------------------------------
  // UPS (V2 endpoints)
  // -----------------------------------------------------------------------

  readonly ups = {
    /**
     * Verify an address via UPS.
     *
     * @deprecated Legacy carrier proxy (sunset 2027-06-30). Needs a user token: API keys get 403
     *   `API_KEY_SCOPE_REQUIRED`. Use `client.shipping` / `client.pickups` / `client.scanForms` where they
     *   cover this.
     */
    validateAddress: (body: unknown) =>
      this.http.post(this.proxy('api/v2/ShippingLabel/postUpsVerifyAddress'), body),

    /**
     * Get UPS rate quotes.
     *
     * @deprecated Legacy carrier proxy (sunset 2027-06-30). Needs a user token: API keys get 403
     *   `API_KEY_SCOPE_REQUIRED`. Use `client.shipping` / `client.pickups` / `client.scanForms` where they
     *   cover this.
     */
    getRates: (body: unknown) =>
      this.http.post(this.proxy('api/v2/ShippingLabel/postUpsRateCheck'), body),

    /** Track a UPS shipment. */
    track: (params: Record<string, string>) =>
      this.http.get(this.proxy('api/v2/ShippingLabel/getSingleUpsTrackingDetail'), params),

    /**
     * Create a UPS pickup.
     *
     * @deprecated Legacy carrier proxy (sunset 2027-06-30). Needs a user token: API keys get 403
     *   `API_KEY_SCOPE_REQUIRED`. Use `client.shipping` / `client.pickups` / `client.scanForms` where they
     *   cover this.
     */
    createPickup: (body: unknown) =>
      this.http.post(this.proxy('api/v2/ShippingLabel/postUpsCreatePickup'), body),

    /**
     * Cancel a UPS pickup.
     *
     * @deprecated Legacy carrier proxy (sunset 2027-06-30). Needs a user token: API keys get 403
     *   `API_KEY_SCOPE_REQUIRED`. Use `client.shipping` / `client.pickups` / `client.scanForms` where they
     *   cover this.
     */
    cancelPickup: () =>
      this.http.delete(this.proxy('api/v2/ShippingLabel/deleteUpsPickup')),

    /**
     * Get UPS transit times.
     *
     * @deprecated Legacy carrier proxy (sunset 2027-06-30). Needs a user token: API keys get 403
     *   `API_KEY_SCOPE_REQUIRED`. Use `client.shipping` / `client.pickups` / `client.scanForms` where they
     *   cover this.
     */
    getTransitTimes: (body: unknown) =>
      this.http.post(this.proxy('api/v2/ShippingLabel/postUpsGetTransitTimes'), body),

    /**
     * Get UPS landed cost quote (international).
     *
     * @deprecated Legacy carrier proxy (sunset 2027-06-30). Needs a user token: API keys get 403
     *   `API_KEY_SCOPE_REQUIRED`. Use `client.shipping` / `client.pickups` / `client.scanForms` where they
     *   cover this.
     */
    getLandedCost: (body: unknown) =>
      this.http.post(this.proxy('api/v2/ShippingLabel/postUpsGetLandedCostQuote'), body),

    /**
     * Search UPS locations.
     *
     * @deprecated Legacy carrier proxy (sunset 2027-06-30). Needs a user token: API keys get 403
     *   `API_KEY_SCOPE_REQUIRED`. Use `client.shipping` / `client.pickups` / `client.scanForms` where they
     *   cover this.
     */
    searchLocations: (body: unknown) =>
      this.http.post(this.proxy('api/v2/ShippingLabel/postUpsSearchLocations'), body),

    /**
     * Upload paperless trade document.
     *
     * @deprecated Legacy carrier proxy (sunset 2027-06-30). Needs a user token: API keys get 403
     *   `API_KEY_SCOPE_REQUIRED`. Use `client.shipping` / `client.pickups` / `client.scanForms` where they
     *   cover this.
     */
    uploadDocument: (body: unknown) =>
      this.http.post(this.proxy('api/v2/ShippingLabel/postUpsUploadPaperlessDocument'), body),

    /**
     * Create UPS freight shipment.
     *
     * @deprecated Legacy carrier proxy (sunset 2027-06-30). Needs a user token: API keys get 403
     *   `API_KEY_SCOPE_REQUIRED`. Use `client.shipping` / `client.pickups` / `client.scanForms` where they
     *   cover this.
     */
    createFreightShipment: (body: unknown) =>
      this.http.post(this.proxy('api/v2/ShippingLabel/postUpsCreateFreightShipment'), body),

    /**
     * Get UPS freight rate.
     *
     * @deprecated Legacy carrier proxy (sunset 2027-06-30). Needs a user token: API keys get 403
     *   `API_KEY_SCOPE_REQUIRED`. Use `client.shipping` / `client.pickups` / `client.scanForms` where they
     *   cover this.
     */
    getFreightRate: (body: unknown) =>
      this.http.post(this.proxy('api/v2/ShippingLabel/postUpsGetFreightRate'), body),
  };

  // -----------------------------------------------------------------------
  // FedEx (V3 endpoints)
  // -----------------------------------------------------------------------

  readonly fedex = {
    /**
     * Validate a domestic address via FedEx.
     *
     * @deprecated Legacy carrier proxy (sunset 2027-06-30). Needs a user token: API keys get 403
     *   `API_KEY_SCOPE_REQUIRED`. Use `client.shipping` / `client.pickups` / `client.scanForms` where they
     *   cover this.
     */
    validateAddress: (body: unknown) =>
      this.http.post(this.proxy('api/v3/AddressValidation/postFedExValidateAndCorrectDomesticAddress'), body),

    /**
     * Validate a postal code.
     *
     * @deprecated Legacy carrier proxy (sunset 2027-06-30). Needs a user token: API keys get 403
     *   `API_KEY_SCOPE_REQUIRED`. Use `client.shipping` / `client.pickups` / `client.scanForms` where they
     *   cover this.
     */
    validatePostalCode: (body: unknown) =>
      this.http.post(this.proxy('api/v3/AddressValidation/postFedExValidatePostalCode'), body),

    /**
     * Get FedEx rate and transit times.
     *
     * @deprecated Legacy carrier proxy (sunset 2027-06-30). Needs a user token: API keys get 403
     *   `API_KEY_SCOPE_REQUIRED`. Use `client.shipping` / `client.pickups` / `client.scanForms` where they
     *   cover this.
     */
    getRates: (body: unknown) =>
      this.http.post(this.proxy('api/v3/RateCalculator/postRetrieveFedExRateAndTransitTimesAsync'), body),

    /**
     * Cancel a FedEx shipment.
     *
     * @deprecated Legacy carrier proxy (sunset 2027-06-30). Needs a user token: API keys get 403
     *   `API_KEY_SCOPE_REQUIRED`. Use `client.shipping` / `client.pickups` / `client.scanForms` where they
     *   cover this.
     */
    cancelShipment: (body: unknown) =>
      this.http.put(this.proxy('api/v3/Shipping/putFedExCancelShipment'), body),

    /**
     * Validate a shipment (dry run).
     *
     * @deprecated Legacy carrier proxy (sunset 2027-06-30). Needs a user token: API keys get 403
     *   `API_KEY_SCOPE_REQUIRED`. Use `client.shipping` / `client.pickups` / `client.scanForms` where they
     *   cover this.
     */
    validateShipment: (body: unknown) =>
      this.http.post(this.proxy('api/v3/Shipping/postFedExValidateShipment'), body),

    /**
     * Track by tracking number.
     *
     * @deprecated Legacy carrier proxy (sunset 2027-06-30). Needs a user token: API keys get 403
     *   `API_KEY_SCOPE_REQUIRED`. Use `client.shipping` / `client.pickups` / `client.scanForms` where they
     *   cover this.
     */
    track: (body: unknown) =>
      this.http.post(this.proxy('api/v3/Tracking/postFedExRetrieveTrackingInfoByTrackingNumber'), body),

    /**
     * Track multi-piece shipment.
     *
     * @deprecated Legacy carrier proxy (sunset 2027-06-30). Needs a user token: API keys get 403
     *   `API_KEY_SCOPE_REQUIRED`. Use `client.shipping` / `client.pickups` / `client.scanForms` where they
     *   cover this.
     */
    trackMultiPiece: (body: unknown) =>
      this.http.post(this.proxy('api/v3/Tracking/postFedExRetrieveTrackingInfoForMultiPieceShipment'), body),

    /**
     * Register for tracking notifications.
     *
     * @deprecated Legacy carrier proxy (sunset 2027-06-30). Needs a user token: API keys get 403
     *   `API_KEY_SCOPE_REQUIRED`. Use `client.shipping` / `client.pickups` / `client.scanForms` where they
     *   cover this.
     */
    registerTrackingNotification: (body: unknown) =>
      this.http.post(this.proxy('api/v3/Tracking/postFedExRegisterForTrackingNotification'), body),

    /**
     * Create a carrier pickup.
     *
     * @deprecated Legacy carrier proxy (sunset 2027-06-30). Needs a user token: API keys get 403
     *   `API_KEY_SCOPE_REQUIRED`. Use `client.shipping` / `client.pickups` / `client.scanForms` where they
     *   cover this.
     */
    createPickup: (body: unknown) =>
      this.http.post(this.proxy('api/v3/CarrierPickup/postFedExCreateCarrierPickupRequest'), body),

    /**
     * Cancel a pickup.
     *
     * @deprecated Legacy carrier proxy (sunset 2027-06-30). Needs a user token: API keys get 403
     *   `API_KEY_SCOPE_REQUIRED`. Use `client.shipping` / `client.pickups` / `client.scanForms` where they
     *   cover this.
     */
    cancelPickup: (body: unknown) =>
      this.http.put(this.proxy('api/v3/CarrierPickup/putFedExCancelCarrierPickupRequest'), body),

    /**
     * Search valid locations.
     *
     * @deprecated Legacy carrier proxy (sunset 2027-06-30). Needs a user token: API keys get 403
     *   `API_KEY_SCOPE_REQUIRED`. Use `client.shipping` / `client.pickups` / `client.scanForms` where they
     *   cover this.
     */
    searchLocations: (body: unknown) =>
      this.http.post(this.proxy('api/v3/LocationSearch/postFedExSearchValidLocations'), body),

    /**
     * Get service standards and transit times.
     *
     * @deprecated Legacy carrier proxy (sunset 2027-06-30). Needs a user token: API keys get 403
     *   `API_KEY_SCOPE_REQUIRED`. Use `client.shipping` / `client.pickups` / `client.scanForms` where they
     *   cover this.
     */
    getServiceStandards: (body: unknown) =>
      this.http.post(this.proxy('api/v3/ServiceStandards/postFedExRetrieveServicesAndTransitTimes'), body),

    /**
     * Get freight rate quote.
     *
     * @deprecated Legacy carrier proxy (sunset 2027-06-30). Needs a user token: API keys get 403
     *   `API_KEY_SCOPE_REQUIRED`. Use `client.shipping` / `client.pickups` / `client.scanForms` where they
     *   cover this.
     */
    getFreightRate: (body: unknown) =>
      this.http.post(this.proxy('api/v3/Freight/postFedExGetFreightRateQuote'), body),

    /**
     * Create freight shipment.
     *
     * @deprecated Legacy carrier proxy (sunset 2027-06-30). Needs a user token: API keys get 403
     *   `API_KEY_SCOPE_REQUIRED`. Use `client.shipping` / `client.pickups` / `client.scanForms` where they
     *   cover this.
     */
    createFreightShipment: (body: unknown) =>
      this.http.post(this.proxy('api/v3/Freight/postFedExCreateFreightShipment'), body),

    /**
     * Ground close with documents.
     *
     * @deprecated Legacy carrier proxy (sunset 2027-06-30). Needs a user token: API keys get 403
     *   `API_KEY_SCOPE_REQUIRED`. Use `client.shipping` / `client.pickups` / `client.scanForms` where they
     *   cover this.
     */
    groundClose: (body: unknown) =>
      this.http.post(this.proxy('api/v3/GroundClose/postFedExCloseWithDocuments'), body),

    /**
     * Upload trade documents.
     *
     * @deprecated Legacy carrier proxy (sunset 2027-06-30). Needs a user token: API keys get 403
     *   `API_KEY_SCOPE_REQUIRED`. Use `client.shipping` / `client.pickups` / `client.scanForms` where they
     *   cover this.
     */
    uploadTradeDocuments: (body: unknown) =>
      this.http.post(this.proxy('api/v3/Trade/postFedExUploadTradeDocuments'), body),

    // --- Open Ship (multi-package) ---

    /**
     * Create an open shipment.
     *
     * @deprecated Legacy carrier proxy (sunset 2027-06-30). Needs a user token: API keys get 403
     *   `API_KEY_SCOPE_REQUIRED`. Use `client.shipping` / `client.pickups` / `client.scanForms` where they
     *   cover this.
     */
    createOpenShipment: (body: unknown) =>
      this.http.post(this.proxy('api/v3/OpenShip/postFedExCreateOpenShipment'), body),

    /**
     * Add packages to an open shipment.
     *
     * @deprecated Legacy carrier proxy (sunset 2027-06-30). Needs a user token: API keys get 403
     *   `API_KEY_SCOPE_REQUIRED`. Use `client.shipping` / `client.pickups` / `client.scanForms` where they
     *   cover this.
     */
    addPackagesToOpenShipment: (body: unknown) =>
      this.http.post(this.proxy('api/v3/OpenShip/postFedExAddPackagesToOpenShipment'), body),

    /**
     * Confirm and finalize an open shipment.
     *
     * @deprecated Legacy carrier proxy (sunset 2027-06-30). Needs a user token: API keys get 403
     *   `API_KEY_SCOPE_REQUIRED`. Use `client.shipping` / `client.pickups` / `client.scanForms` where they
     *   cover this.
     */
    confirmOpenShipment: (body: unknown) =>
      this.http.post(this.proxy('api/v3/OpenShip/postFedExConfirmOpenShipment'), body),
  };

  // -----------------------------------------------------------------------
  // DHL (V2 endpoints)
  // -----------------------------------------------------------------------

  readonly dhl = {
    /** Validate an address via DHL. */
    validateAddress: (params: Record<string, string>) =>
      this.http.get(this.proxy('api/v2/ShippingLabel/getDhlValidateAddress'), params),

    /** Get DHL shipping rates. */
    getRates: (params: Record<string, string>) =>
      this.http.get(this.proxy('api/v2/ShippingLabel/getDhlRates'), params),

    /**
     * Get multi-piece rates.
     *
     * @deprecated Legacy carrier proxy (sunset 2027-06-30). Needs a user token: API keys get 403
     *   `API_KEY_SCOPE_REQUIRED`. Use `client.shipping` / `client.pickups` / `client.scanForms` where they
     *   cover this.
     */
    getMultiPieceRates: (body: unknown) =>
      this.http.post(this.proxy('api/v2/ShippingLabel/postDhlMultiPieceRates'), body),

    /** Get DHL products/services. */
    getProducts: (params: Record<string, string>) =>
      this.http.get(this.proxy('api/v2/ShippingLabel/getDhlProducts'), params),

    /** Track a DHL shipment. */
    track: (params: Record<string, string>) =>
      this.http.get(this.proxy('api/v2/ShippingLabel/getDhlTrackSingleShipment'), params),

    /** Track multiple DHL shipments. */
    trackMultiple: (params: Record<string, string>) =>
      this.http.get(this.proxy('api/v2/ShippingLabel/getDhlTrackMultipleShipments'), params),

    /**
     * Create a DHL pickup.
     *
     * @deprecated Legacy carrier proxy (sunset 2027-06-30). Needs a user token: API keys get 403
     *   `API_KEY_SCOPE_REQUIRED`. Use `client.shipping` / `client.pickups` / `client.scanForms` where they
     *   cover this.
     */
    createPickup: (body: unknown) =>
      this.http.post(this.proxy('api/v2/ShippingLabel/postDhlCreatePickup'), body),

    /**
     * Cancel a DHL pickup.
     *
     * @deprecated Legacy carrier proxy (sunset 2027-06-30). Needs a user token: API keys get 403
     *   `API_KEY_SCOPE_REQUIRED`. Use `client.shipping` / `client.pickups` / `client.scanForms` where they
     *   cover this.
     */
    cancelPickup: () =>
      this.http.delete(this.proxy('api/v2/ShippingLabel/deleteDhlPickup')),

    /**
     * Calculate landed cost (duties/taxes).
     *
     * @deprecated Legacy carrier proxy (sunset 2027-06-30). Needs a user token: API keys get 403
     *   `API_KEY_SCOPE_REQUIRED`. Use `client.shipping` / `client.pickups` / `client.scanForms` where they
     *   cover this.
     */
    calculateLandedCost: (body: unknown) =>
      this.http.post(this.proxy('api/v2/ShippingLabel/postDhlCalculateLandedCost'), body),

    /**
     * Screen a shipment for compliance.
     *
     * @deprecated Legacy carrier proxy (sunset 2027-06-30). Needs a user token: API keys get 403
     *   `API_KEY_SCOPE_REQUIRED`. Use `client.shipping` / `client.pickups` / `client.scanForms` where they
     *   cover this.
     */
    screenShipment: (body: unknown) =>
      this.http.post(this.proxy('api/v2/ShippingLabel/postDhlScreenShipment'), body),

    /**
     * Upload an invoice.
     *
     * @deprecated Legacy carrier proxy (sunset 2027-06-30). Needs a user token: API keys get 403
     *   `API_KEY_SCOPE_REQUIRED`. Use `client.shipping` / `client.pickups` / `client.scanForms` where they
     *   cover this.
     */
    uploadInvoice: (body: unknown) =>
      this.http.post(this.proxy('api/v2/ShippingLabel/postDhlUploadInvoice'), body),

    /** Get electronic proof of delivery. */
    getProofOfDelivery: (params: Record<string, string>) =>
      this.http.get(this.proxy('api/v2/ShippingLabel/getDhlElectronicProofOfDelivery'), params),

    /** Get reference data (countries, services, etc.). */
    getReferenceData: (params: Record<string, string>) =>
      this.http.get(this.proxy('api/v2/ShippingLabel/getDhlReferenceData'), params),

    /** Find DHL service points. */
    findServicePoints: (params: Record<string, string>) =>
      this.http.get(this.proxy('api/v2/ShippingLabel/getDhlServicePoints'), params),
  };
}
