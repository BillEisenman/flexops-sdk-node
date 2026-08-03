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

export class AnalyticsResource {
  constructor(private readonly http: HttpClient) {}

  private path(endpoint: string): string {
    return `/api/ApiProxy/api/v4/Analytics/${endpoint}`;
  }

  /** Shipments trend over time. */
  async shipmentsTrend(params?: DateRange): Promise<ApiResponse<ShipmentsTrend[]>> {
    return this.http.get(this.path('ShipmentsTrend'), params);
  }

  /** Carrier usage summary. */
  async carrierSummary(params?: DateRange): Promise<ApiResponse<CarrierSummary[]>> {
    return this.http.get(this.path('CarrierSummary'), params);
  }

  /** Top shipping destinations. */
  async topDestinations(params?: DateRange & { limit?: number }): Promise<ApiResponse<unknown>> {
    return this.http.get(this.path('TopDestinations'), params);
  }

  /** Inventory metrics (stock levels, low-stock alerts). */
  async inventoryMetrics(): Promise<ApiResponse<unknown>> {
    return this.http.get(this.path('InventoryMetrics'));
  }

  /** Stock levels by warehouse. */
  async stockByWarehouse(): Promise<ApiResponse<unknown>> {
    return this.http.get(this.path('StockByWarehouse'));
  }

  /** Order metrics (volume, revenue). */
  async orderMetrics(params?: DateRange): Promise<ApiResponse<unknown>> {
    return this.http.get(this.path('OrderMetrics'), params);
  }

  /** Order trend over time. */
  async orderTrend(params?: DateRange): Promise<ApiResponse<unknown>> {
    return this.http.get(this.path('OrderTrend'), params);
  }

  /** Top selling products. */
  async topSellingProducts(params?: DateRange & { limit?: number }): Promise<ApiResponse<unknown>> {
    return this.http.get(this.path('TopSellingProducts'), params);
  }

  /** Returns metrics. */
  async returnsMetrics(params?: DateRange): Promise<ApiResponse<unknown>> {
    return this.http.get(this.path('ReturnsMetrics'), params);
  }

  /** Returns trend over time. */
  async returnsTrend(params?: DateRange): Promise<ApiResponse<unknown>> {
    return this.http.get(this.path('ReturnsTrend'), params);
  }

  /** Return reasons breakdown. */
  async returnReasons(params?: DateRange): Promise<ApiResponse<unknown>> {
    return this.http.get(this.path('ReturnReasons'), params);
  }

  /** Fulfillment performance metrics. */
  async performanceMetrics(params?: DateRange): Promise<ApiResponse<unknown>> {
    return this.http.get(this.path('PerformanceMetrics'), params);
  }

  /** Carrier delivery performance. */
  async carrierPerformance(params?: DateRange): Promise<ApiResponse<unknown>> {
    return this.http.get(this.path('CarrierPerformance'), params);
  }

  /** Shipping cost analytics. */
  async shippingCostAnalytics(params?: DateRange): Promise<ApiResponse<unknown>> {
    return this.http.get(this.path('ShippingCostAnalytics'), params);
  }

  /** Delivery performance (on-time %). */
  async deliveryPerformance(params?: DateRange): Promise<ApiResponse<unknown>> {
    return this.http.get(this.path('DeliveryPerformance'), params);
  }
}
