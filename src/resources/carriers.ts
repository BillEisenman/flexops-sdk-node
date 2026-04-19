// ***********************************************************************
// Package          : @flexops/sdk
// Author           : FlexOps, LLC
// Created          : 2026-03-04
//
// Copyright (c) 2021-2026 by FlexOps, LLC. All rights reserved.
// ***********************************************************************

import type { HttpClient } from '../http.js';

/**
 * Direct carrier operations via the VisionSuite Core Services API proxy.
 *
 * These methods provide pass-through access to carrier-specific endpoints
 * (USPS, UPS, FedEx, DHL) via the Gateway's ApiProxy route. Use the
 * high-level `client.shipping` methods for normalized operations, or
 * these carrier-specific methods when you need full control.
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

    /** Search domestic shipping rates. */
    getDomesticRates: (body: unknown) =>
      this.http.post(this.proxy('api/v3/RateCalculator/postUspsSearchDomesticBaseRates'), body),

    /** Search domestic product eligibility. */
    getDomesticProducts: (body: unknown) =>
      this.http.post(this.proxy('api/v3/RateCalculator/postUspsSearchEligibleDomesticProducts'), body),

    /** Search domestic prices. */
    getDomesticPrices: (body: unknown) =>
      this.http.post(this.proxy('api/v3/RateCalculator/postUspsSearchEligibleDomesticPrices'), body),

    /** Search international rates. */
    getInternationalRates: (body: unknown) =>
      this.http.post(this.proxy('api/v3/RateCalculator/postUspsSearchInternationalBaseRates'), body),

    /** Search international prices. */
    getInternationalPrices: (body: unknown) =>
      this.http.post(this.proxy('api/v3/RateCalculator/postUspsSearchEligibleInternationalPrices'), body),

    /** Generate a domestic shipping label. */
    createDomesticLabel: (body: unknown) =>
      this.http.post(this.proxy('api/v3/Shipping/postUspsGenerateDomesticShippingLabel'), body),

    /** Generate a domestic return label. */
    createReturnLabel: (body: unknown) =>
      this.http.post(this.proxy('api/v3/Shipping/postUspsGenerateDomesticReturnsShippingLabel'), body),

    /** Generate an international shipping label. */
    createInternationalLabel: (body: unknown) =>
      this.http.post(this.proxy('api/v3/Shipping/postUspsGenerateInternationalShippingLabel'), body),

    /** Cancel a domestic label. */
    cancelDomesticLabel: () =>
      this.http.delete(this.proxy('api/v3/Shipping/cancelUspsDomesticShipmentLabel')),

    /** Cancel an international label. */
    cancelInternationalLabel: () =>
      this.http.delete(this.proxy('api/v3/Shipping/cancelUspsInternationalShipmentLabel')),

    /** Get tracking summary. */
    trackSummary: (params: Record<string, string>) =>
      this.http.get(this.proxy('api/v3/Tracking/getUspsTrackingSummaryInformation'), params),

    /** Get detailed tracking info. */
    trackDetail: (params: Record<string, string>) =>
      this.http.get(this.proxy('api/v3/Tracking/getUspsTrackingDetailInformation'), params),

    /** Schedule a carrier pickup. */
    createPickup: (body: unknown) =>
      this.http.post(this.proxy('api/v3/CarrierPickup/postUspsCreateCarrierPickupSchedule'), body),

    /** Cancel a pickup. */
    cancelPickup: () =>
      this.http.delete(this.proxy('api/v3/CarrierPickup/cancelUspsCarrierPickupSchedule')),

    /** Create a scan form. */
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
    /** Verify an address via UPS. */
    validateAddress: (body: unknown) =>
      this.http.post(this.proxy('api/v2/ShippingLabel/postUpsVerifyAddress'), body),

    /** Get UPS rate quotes. */
    getRates: (body: unknown) =>
      this.http.post(this.proxy('api/v2/ShippingLabel/postUpsRateCheck'), body),

    /** Generate a UPS shipping label. */
    createLabel: (body: unknown) =>
      this.http.post(this.proxy('api/v2/ShippingLabel/generateNewUpsShipLabel'), body),

    /** Track a UPS shipment. */
    track: (params: Record<string, string>) =>
      this.http.get(this.proxy('api/v2/ShippingLabel/getSingleUpsTrackingDetail'), params),

    /** Create a UPS pickup. */
    createPickup: (body: unknown) =>
      this.http.post(this.proxy('api/v2/ShippingLabel/postUpsCreatePickup'), body),

    /** Cancel a UPS pickup. */
    cancelPickup: () =>
      this.http.delete(this.proxy('api/v2/ShippingLabel/deleteUpsPickup')),

    /** Get UPS transit times. */
    getTransitTimes: (body: unknown) =>
      this.http.post(this.proxy('api/v2/ShippingLabel/postUpsGetTransitTimes'), body),

    /** Get UPS landed cost quote (international). */
    getLandedCost: (body: unknown) =>
      this.http.post(this.proxy('api/v2/ShippingLabel/postUpsGetLandedCostQuote'), body),

    /** Search UPS locations. */
    searchLocations: (body: unknown) =>
      this.http.post(this.proxy('api/v2/ShippingLabel/postUpsSearchLocations'), body),

    /** Upload paperless trade document. */
    uploadDocument: (body: unknown) =>
      this.http.post(this.proxy('api/v2/ShippingLabel/postUpsUploadPaperlessDocument'), body),

    /** Create UPS freight shipment. */
    createFreightShipment: (body: unknown) =>
      this.http.post(this.proxy('api/v2/ShippingLabel/postUpsCreateFreightShipment'), body),

    /** Get UPS freight rate. */
    getFreightRate: (body: unknown) =>
      this.http.post(this.proxy('api/v2/ShippingLabel/postUpsGetFreightRate'), body),
  };

  // -----------------------------------------------------------------------
  // FedEx (V3 endpoints)
  // -----------------------------------------------------------------------

  readonly fedex = {
    /** Validate a domestic address via FedEx. */
    validateAddress: (body: unknown) =>
      this.http.post(this.proxy('api/v3/AddressValidation/postFedExValidateAndCorrectDomesticAddress'), body),

    /** Validate a postal code. */
    validatePostalCode: (body: unknown) =>
      this.http.post(this.proxy('api/v3/AddressValidation/postFedExValidatePostalCode'), body),

    /** Get FedEx rate and transit times. */
    getRates: (body: unknown) =>
      this.http.post(this.proxy('api/v3/RateCalculator/postRetrieveFedExRateAndTransitTimesAsync'), body),

    /** Create a FedEx shipment. */
    createShipment: (body: unknown) =>
      this.http.post(this.proxy('api/v3/Shipping/postFedExCreateNewShipment'), body),

    /** Cancel a FedEx shipment. */
    cancelShipment: (body: unknown) =>
      this.http.put(this.proxy('api/v3/Shipping/putFedExCancelShipment'), body),

    /** Validate a shipment (dry run). */
    validateShipment: (body: unknown) =>
      this.http.post(this.proxy('api/v3/Shipping/postFedExValidateShipment'), body),

    /** Create a return shipment. */
    createReturnShipment: (body: unknown) =>
      this.http.post(this.proxy('api/v3/Shipping/postFedExCreateNewReturnShipment'), body),

    /** Track by tracking number. */
    track: (body: unknown) =>
      this.http.post(this.proxy('api/v3/Tracking/postFedExRetrieveTrackingInfoByTrackingNumber'), body),

    /** Track multi-piece shipment. */
    trackMultiPiece: (body: unknown) =>
      this.http.post(this.proxy('api/v3/Tracking/postFedExRetrieveTrackingInfoForMultiPieceShipment'), body),

    /** Register for tracking notifications. */
    registerTrackingNotification: (body: unknown) =>
      this.http.post(this.proxy('api/v3/Tracking/postFedExRegisterForTrackingNotification'), body),

    /** Create a carrier pickup. */
    createPickup: (body: unknown) =>
      this.http.post(this.proxy('api/v3/CarrierPickup/postFedExCreateCarrierPickupRequest'), body),

    /** Cancel a pickup. */
    cancelPickup: (body: unknown) =>
      this.http.put(this.proxy('api/v3/CarrierPickup/putFedExCancelCarrierPickupRequest'), body),

    /** Search valid locations. */
    searchLocations: (body: unknown) =>
      this.http.post(this.proxy('api/v3/LocationSearch/postFedExSearchValidLocations'), body),

    /** Get service standards and transit times. */
    getServiceStandards: (body: unknown) =>
      this.http.post(this.proxy('api/v3/ServiceStandards/postFedExRetrieveServicesAndTransitTimes'), body),

    /** Get freight rate quote. */
    getFreightRate: (body: unknown) =>
      this.http.post(this.proxy('api/v3/Freight/postFedExGetFreightRateQuote'), body),

    /** Create freight shipment. */
    createFreightShipment: (body: unknown) =>
      this.http.post(this.proxy('api/v3/Freight/postFedExCreateFreightShipment'), body),

    /** Ground close with documents. */
    groundClose: (body: unknown) =>
      this.http.post(this.proxy('api/v3/GroundClose/postFedExCloseWithDocuments'), body),

    /** Upload trade documents. */
    uploadTradeDocuments: (body: unknown) =>
      this.http.post(this.proxy('api/v3/Trade/postFedExUploadTradeDocuments'), body),

    // --- Open Ship (multi-package) ---

    /** Create an open shipment. */
    createOpenShipment: (body: unknown) =>
      this.http.post(this.proxy('api/v3/OpenShip/postFedExCreateOpenShipment'), body),

    /** Add packages to an open shipment. */
    addPackagesToOpenShipment: (body: unknown) =>
      this.http.post(this.proxy('api/v3/OpenShip/postFedExAddPackagesToOpenShipment'), body),

    /** Confirm and finalize an open shipment. */
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

    /** Get multi-piece rates. */
    getMultiPieceRates: (body: unknown) =>
      this.http.post(this.proxy('api/v2/ShippingLabel/postDhlMultiPieceRates'), body),

    /** Get DHL products/services. */
    getProducts: (params: Record<string, string>) =>
      this.http.get(this.proxy('api/v2/ShippingLabel/getDhlProducts'), params),

    /** Create a DHL shipment (label). */
    createShipment: (body: unknown) =>
      this.http.post(this.proxy('api/v2/ShippingLabel/postDhlCreateShipment'), body),

    /** Track a DHL shipment. */
    track: (params: Record<string, string>) =>
      this.http.get(this.proxy('api/v2/ShippingLabel/getDhlTrackSingleShipment'), params),

    /** Track multiple DHL shipments. */
    trackMultiple: (params: Record<string, string>) =>
      this.http.get(this.proxy('api/v2/ShippingLabel/getDhlTrackMultipleShipments'), params),

    /** Create a DHL pickup. */
    createPickup: (body: unknown) =>
      this.http.post(this.proxy('api/v2/ShippingLabel/postDhlCreatePickup'), body),

    /** Update a DHL pickup. */
    updatePickup: (body: unknown) =>
      this.http.patch(this.proxy('api/v2/ShippingLabel/patchDhlUpdatePickup'), body),

    /** Cancel a DHL pickup. */
    cancelPickup: () =>
      this.http.delete(this.proxy('api/v2/ShippingLabel/deleteDhlPickup')),

    /** Calculate landed cost (duties/taxes). */
    calculateLandedCost: (body: unknown) =>
      this.http.post(this.proxy('api/v2/ShippingLabel/postDhlCalculateLandedCost'), body),

    /** Screen a shipment for compliance. */
    screenShipment: (body: unknown) =>
      this.http.post(this.proxy('api/v2/ShippingLabel/postDhlScreenShipment'), body),

    /** Upload an invoice. */
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
