// ***********************************************************************
// Package          : @flexops/sdk
// Author           : FlexOps, LLC
// Created          : 2026-03-04
//
// Copyright (c) 2021-2026 by FlexOps, LLC. All rights reserved.
// ***********************************************************************

import type { HttpClient } from '../http.js';
import type { ApiResponse, Order } from '../types.js';

export class OrdersResource {
  constructor(private readonly http: HttpClient) {}

  private path(endpoint: string): string {
    return `/api/ApiProxy/api/v1/Order/${endpoint}`;
  }

  /** Create a new order. */
  async create(order: unknown): Promise<ApiResponse<unknown>> {
    return this.http.post(this.path('postNewOrder'), order);
  }

  /** Get new orders awaiting processing. */
  async getNewOrders(params?: Record<string, string>): Promise<ApiResponse<Order[]>> {
    return this.http.get(this.path('getNewOrderList'), params);
  }

  /** Get all orders filtered by status. */
  async getByStatus(params?: Record<string, string>): Promise<ApiResponse<Order[]>> {
    return this.http.get(this.path('getAllOrderListByStatus'), params);
  }

  /** Get complete order details by order number. */
  async getDetails(orderNumber: string): Promise<ApiResponse<Order>> {
    return this.http.get(this.path('getCompleteOrderDetailsByOrderNumber'), { orderNumber });
  }

  /** Get extended order details by order number. */
  async getExtendedDetails(orderNumber: string): Promise<ApiResponse<unknown>> {
    return this.http.get(this.path('getExtendedOrderDetailsByOrderNumber'), { orderNumber });
  }

  /** Get order status by order number. */
  async getStatus(orderNumber: string): Promise<ApiResponse<unknown>> {
    return this.http.get(this.path('getIndividualOrderStatusByOrderNumber'), { orderNumber });
  }

  /** Cancel an order. */
  async cancel(orderNumber: string): Promise<ApiResponse<unknown>> {
    return this.http.post(this.path('cancelOrderByOrderNumber'), { orderNumber });
  }

  /** Get all items for an order. */
  async getItems(orderNumber: string): Promise<ApiResponse<unknown>> {
    return this.http.get(this.path('getAllOrderItemsByOrderNumber'), { orderNumber });
  }

  /** Get available ship methods. */
  async getShipMethods(): Promise<ApiResponse<unknown>> {
    return this.http.get(this.path('getAvailableShipMethodsList'));
  }

  /** Get active warehouse list. */
  async getWarehouses(): Promise<ApiResponse<unknown>> {
    return this.http.get(this.path('getActiveWarehouseList'));
  }

  /** Get country codes. */
  async getCountryCodes(): Promise<ApiResponse<unknown>> {
    return this.http.get(this.path('getCountryNameCodeList'));
  }

  /** Get order status types. */
  async getStatusTypes(): Promise<ApiResponse<unknown>> {
    return this.http.get(this.path('getOrderStatusTypesList'));
  }
}
