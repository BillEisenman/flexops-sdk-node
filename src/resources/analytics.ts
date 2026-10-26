// ***********************************************************************
// Package          : @flexops/sdk
// Author           : FlexOps, LLC
// Created          : 2026-03-04
//
// Copyright (c) 2021-2026 by FlexOps, LLC. All rights reserved.
// ***********************************************************************

import type { HttpClient } from '../http.js';
import type { ApiResponse, ShipmentsTrend, CarrierSummary } from '../types.js';

type DateRange = {
  startDate?: string;
  endDate?: string;
  period?: 'day' | 'week' | 'month';
};

/**
 * Analytics through the legacy VisionSuite API proxy (`/api/ApiProxy/api/v4/Analytics/...`).
 *
 * With an API key, each method requires the permission for the data it reads, named on the method:
 * `shipping:read` for shipment, carrier and delivery metrics, `inventory:read` for inventory metrics,
 * `orders:read` for order metrics and `returns:read` for returns metrics. A key without it gets 403
 * `API_KEY_SCOPE_REQUIRED`. Keys created with the default permissions have all four.
 */
export class AnalyticsResource {
  constructor(private readonly http: HttpClient) {}

  private path(endpoint: string): string {
    return `/api/ApiProxy/api/v4/Analytics/${endpoint}`;
  }

  /** Shipments trend over time. With an API key, requires `shipping:read`. */
  async shipmentsTrend(params?: DateRange): Promise<ApiResponse<ShipmentsTrend[]>> {
    return this.http.get(this.path('ShipmentsTrend'), params);
  }

  /** Carrier usage summary. With an API key, requires `shipping:read`. */
  async carrierSummary(params?: DateRange): Promise<ApiResponse<CarrierSummary[]>> {
    return this.http.get(this.path('CarrierSummary'), params);
  }

  /** Top shipping destinations. With an API key, requires `shipping:read`. */
  async topDestinations(params?: DateRange & { limit?: number }): Promise<ApiResponse<unknown>> {
    return this.http.get(this.path('TopDestinations'), params);
  }

  /** Inventory metrics (stock levels, low-stock alerts). With an API key, requires `inventory:read`. */
  async inventoryMetrics(): Promise<ApiResponse<unknown>> {
    return this.http.get(this.path('InventoryMetrics'));
  }

  /** Stock levels by warehouse. With an API key, requires `inventory:read`. */
  async stockByWarehouse(): Promise<ApiResponse<unknown>> {
    return this.http.get(this.path('StockByWarehouse'));
  }

  /** Order metrics (volume, revenue). With an API key, requires `orders:read`. */
  async orderMetrics(params?: DateRange): Promise<ApiResponse<unknown>> {
    return this.http.get(this.path('OrderMetrics'), params);
  }

  /** Order trend over time. With an API key, requires `orders:read`. */
  async orderTrend(params?: DateRange): Promise<ApiResponse<unknown>> {
    return this.http.get(this.path('OrderTrend'), params);
  }

  /** Top selling products. With an API key, requires `orders:read`. */
  async topSellingProducts(params?: DateRange & { limit?: number }): Promise<ApiResponse<unknown>> {
    return this.http.get(this.path('TopSellingProducts'), params);
  }

  /** Returns metrics. With an API key, requires `returns:read`. */
  async returnsMetrics(params?: DateRange): Promise<ApiResponse<unknown>> {
    return this.http.get(this.path('ReturnsMetrics'), params);
  }

  /** Returns trend over time. With an API key, requires `returns:read`. */
  async returnsTrend(params?: DateRange): Promise<ApiResponse<unknown>> {
    return this.http.get(this.path('ReturnsTrend'), params);
  }

  /** Return reasons breakdown. With an API key, requires `returns:read`. */
  async returnReasons(params?: DateRange): Promise<ApiResponse<unknown>> {
    return this.http.get(this.path('ReturnReasons'), params);
  }

  /** Fulfillment performance metrics. With an API key, requires `shipping:read`. */
  async performanceMetrics(params?: DateRange): Promise<ApiResponse<unknown>> {
    return this.http.get(this.path('PerformanceMetrics'), params);
  }

  /** Carrier delivery performance. With an API key, requires `shipping:read`. */
  async carrierPerformance(params?: DateRange): Promise<ApiResponse<unknown>> {
    return this.http.get(this.path('CarrierPerformance'), params);
  }

  /** Shipping cost analytics. With an API key, requires `shipping:read`. */
  async shippingCostAnalytics(params?: DateRange): Promise<ApiResponse<unknown>> {
    return this.http.get(this.path('ShippingCostAnalytics'), params);
  }

  /** Delivery performance (on-time %). With an API key, requires `shipping:read`. */
  async deliveryPerformance(params?: DateRange): Promise<ApiResponse<unknown>> {
    return this.http.get(this.path('DeliveryPerformance'), params);
  }
}
