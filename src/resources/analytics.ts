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
    return this.http.get(this.path('ShipmentsTrend'), params as Record<string, string>);
  }

  /** Carrier usage summary. */
  async carrierSummary(params?: DateRange): Promise<ApiResponse<CarrierSummary[]>> {
    return this.http.get(this.path('CarrierSummary'), params as Record<string, string>);
  }

  /** Top shipping destinations. */
  async topDestinations(params?: DateRange & { limit?: number }): Promise<ApiResponse<unknown>> {
    return this.http.get(this.path('TopDestinations'), params as Record<string, string>);
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
    return this.http.get(this.path('OrderMetrics'), params as Record<string, string>);
  }

  /** Order trend over time. */
  async orderTrend(params?: DateRange): Promise<ApiResponse<unknown>> {
    return this.http.get(this.path('OrderTrend'), params as Record<string, string>);
  }

  /** Top selling products. */
  async topSellingProducts(params?: DateRange & { limit?: number }): Promise<ApiResponse<unknown>> {
    return this.http.get(this.path('TopSellingProducts'), params as Record<string, string>);
  }

  /** Returns metrics. */
  async returnsMetrics(params?: DateRange): Promise<ApiResponse<unknown>> {
    return this.http.get(this.path('ReturnsMetrics'), params as Record<string, string>);
  }

  /** Returns trend over time. */
  async returnsTrend(params?: DateRange): Promise<ApiResponse<unknown>> {
    return this.http.get(this.path('ReturnsTrend'), params as Record<string, string>);
  }

  /** Return reasons breakdown. */
  async returnReasons(params?: DateRange): Promise<ApiResponse<unknown>> {
    return this.http.get(this.path('ReturnReasons'), params as Record<string, string>);
  }

  /** Fulfillment performance metrics. */
  async performanceMetrics(params?: DateRange): Promise<ApiResponse<unknown>> {
    return this.http.get(this.path('PerformanceMetrics'), params as Record<string, string>);
  }

  /** Carrier delivery performance. */
  async carrierPerformance(params?: DateRange): Promise<ApiResponse<unknown>> {
    return this.http.get(this.path('CarrierPerformance'), params as Record<string, string>);
  }

  /** Shipping cost analytics. */
  async shippingCostAnalytics(params?: DateRange): Promise<ApiResponse<unknown>> {
    return this.http.get(this.path('ShippingCostAnalytics'), params as Record<string, string>);
  }

  /** Delivery performance (on-time %). */
  async deliveryPerformance(params?: DateRange): Promise<ApiResponse<unknown>> {
    return this.http.get(this.path('DeliveryPerformance'), params as Record<string, string>);
  }
}
