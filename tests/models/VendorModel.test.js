const UserModel = require('../../models/UserModel');
const VendorModel = require('../../models/VendorModel');

describe('VendorModel', () => {
  let vendorUser;
  let createdVendor;

  beforeAll(() => {
    vendorUser = UserModel.create({
      email: 'vendor-model@example.com',
      password_hash: '$2a$10$dummyhash',
      name: 'Vendor Model Test',
      role: 'vendor'
    });
  });

  test('create vendor returns vendor with fields', () => {
    createdVendor = VendorModel.create({
      user_id: vendorUser.id,
      company_name: 'GreenTech Solutions',
      description: 'Eco-friendly tech provider',
      website: 'https://greentech.example.com',
      country: 'US',
      tax_id: 'TAX-12345',
      green_certifications: ['ISO 14001', 'Energy Star']
    });

    expect(createdVendor).toBeDefined();
    expect(createdVendor.id).toBeDefined();
    expect(createdVendor.company_name).toBe('GreenTech Solutions');
    expect(createdVendor.user_id).toBe(vendorUser.id);
    expect(createdVendor.country).toBe('US');
    expect(createdVendor.green_certifications).toBeTruthy();
    const certs = JSON.parse(createdVendor.green_certifications);
    expect(certs).toContain('ISO 14001');
    expect(createdVendor.is_approved).toBe(0);
  });

  test('findById returns correct vendor', () => {
    const found = VendorModel.findById(createdVendor.id);
    expect(found).toBeDefined();
    expect(found.company_name).toBe('GreenTech Solutions');
  });

  test('findByUserId returns vendor for user', () => {
    const found = VendorModel.findByUserId(vendorUser.id);
    expect(found).toBeDefined();
    expect(found.company_name).toBe('GreenTech Solutions');
  });

  test('update changes fields and returns updated vendor', () => {
    const updated = VendorModel.update(createdVendor.id, {
      company_name: 'GreenTech Solutions Updated',
      country: 'CA'
    });

    expect(updated.company_name).toBe('GreenTech Solutions Updated');
    expect(updated.country).toBe('CA');
    expect(updated.updated_at).not.toBe(createdVendor.updated_at);
  });

  test('findAll returns paginated list', () => {
    const result = VendorModel.findAll({ page: 1, limit: 10 });
    expect(result.data).toBeDefined();
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data.length).toBeGreaterThanOrEqual(1);
    expect(result.pagination).toBeDefined();
    expect(result.pagination.page).toBe(1);
    expect(result.pagination.total).toBeGreaterThanOrEqual(1);
  });

  test('findAll with is_approved filter returns filtered results', () => {
    const result = VendorModel.findAll({ is_approved: false });
    expect(result.data).toBeDefined();
    // All returned should have is_approved = 0
    result.data.forEach(v => {
      expect(v.is_approved).toBe(0);
    });
  });
});
