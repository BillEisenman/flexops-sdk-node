import { describe, expectTypeOf, it } from 'vitest';
import type { ScanForm, ScanFormState } from '../src/index';

describe('ScanForm', () => {
  it('has the fields the Gateway sends', () => {
    expectTypeOf<ScanForm['scanFormId']>().toEqualTypeOf<string>();
    expectTypeOf<ScanForm['state']>().toEqualTypeOf<ScanFormState>();
    expectTypeOf<ScanForm['scanFormImage']>().toEqualTypeOf<string | null>();
    expectTypeOf<ScanForm['createdAtUtc']>().toEqualTypeOf<string>();
    expectTypeOf<ScanForm['manifestNumber']>().toEqualTypeOf<string | null>();
    expectTypeOf<ScanForm['manifestDate']>().toEqualTypeOf<string | null>();
    expectTypeOf<ScanForm['packageCount']>().toEqualTypeOf<number>();
    expectTypeOf<ScanForm['success']>().toEqualTypeOf<boolean>();
    expectTypeOf<ScanForm['isSandbox']>().toEqualTypeOf<boolean>();
  });

  it('keeps the old names, optional because the Gateway never sent them', () => {
    expectTypeOf<ScanForm['formData']>().toEqualTypeOf<string | undefined>();
    expectTypeOf<ScanForm['createdAt']>().toEqualTypeOf<string | undefined>();
  });
});
