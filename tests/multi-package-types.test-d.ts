import { describe, expectTypeOf, it } from 'vitest';
import type { MultiPackageShipmentRequest } from '../src/index';

describe('MultiPackageShipmentRequest', () => {
  it('requires maximumPostageAmount, the most the whole shipment may cost in USD', () => {
    expectTypeOf<MultiPackageShipmentRequest['maximumPostageAmount']>().toEqualTypeOf<number>();

    // @ts-expect-error maximumPostageAmount is required: the Gateway refuses a request without it
    const withoutCeiling: MultiPackageShipmentRequest = {
      orderId: 1,
      carrierCode: 'USPS',
      packages: [{ weightInOunces: 16, lengthInInches: 10, widthInInches: 8, heightInInches: 4 }],
    };
    expectTypeOf(withoutCeiling).toBeObject();
  });
});
