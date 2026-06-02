import { describe, it, expect } from 'vitest';
import { loginSchema, registerDriverSchema } from '../../src/validators/auth.validators';
import { createFacilitySchema } from '../../src/validators/owner.validators';

describe('registerDriverSchema', () => {
  it('accepts valid input and lowercases the email', () => {
    const parsed = registerDriverSchema.parse({
      name: 'Meron Tesfaye',
      email: 'Meron@Example.com',
      phoneNumber: '+251911223344',
      password: 'Secret123',
    });
    expect(parsed.email).toBe('meron@example.com');
  });

  it('rejects an invalid email', () => {
    expect(() =>
      registerDriverSchema.parse({
        name: 'X',
        email: 'not-an-email',
        phoneNumber: '+251911223344',
        password: 'Secret123',
      }),
    ).toThrow();
  });

  it('rejects a short password', () => {
    const result = registerDriverSchema.safeParse({
      name: 'Meron',
      email: 'm@example.com',
      phoneNumber: '+251911223344',
      password: 'short',
    });
    expect(result.success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('requires email and password', () => {
    expect(loginSchema.safeParse({ email: '', password: '' }).success).toBe(false);
  });
});

describe('createFacilitySchema', () => {
  const valid = {
    name: 'Test Lot',
    address: 'Bole, Addis Ababa',
    latitude: 9.0,
    longitude: 38.75,
    totalSpaces: 100,
    availableSpaces: 40,
    hourlyPrice: 25,
  };

  it('defaults facilityType to MANUAL and congestion to MEDIUM', () => {
    const parsed = createFacilitySchema.parse(valid);
    expect(parsed.facilityType).toBe('MANUAL');
    expect(parsed.congestionLevel).toBe('MEDIUM');
  });

  it('rejects availableSpaces greater than totalSpaces', () => {
    const result = createFacilitySchema.safeParse({ ...valid, availableSpaces: 200 });
    expect(result.success).toBe(false);
  });

  it('requires API details for API_INTEGRATED facilities', () => {
    const result = createFacilitySchema.safeParse({ ...valid, facilityType: 'API_INTEGRATED' });
    expect(result.success).toBe(false);
  });

  it('accepts an API_INTEGRATED facility with API details', () => {
    const result = createFacilitySchema.safeParse({
      ...valid,
      facilityType: 'API_INTEGRATED',
      api: { endpointUrl: 'https://example.com/feed', authToken: 'tok', refreshIntervalSeconds: 120 },
    });
    expect(result.success).toBe(true);
  });
});
