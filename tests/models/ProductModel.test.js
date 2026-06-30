const UserModel = require('../../models/UserModel');
const VendorModel = require('../../models/VendorModel');
const ProductCategoryModel = require('../../models/ProductCategoryModel');
const ProductModel = require('../../models/ProductModel');

describe('ProductModel', () => {
  let vendorUser;
  let vendor;
  let category;
  let createdProduct;

  beforeAll(() => {
    vendorUser = UserModel.create({
      email: 'product-model-vendor@example.com',
      password_hash: '$2a$10$dummyhash',
      name: 'Product Vendor',
      role: 'vendor'
    });

    vendor = VendorModel.create({
      user_id: vendorUser.id,
      company_name: 'Product Vendor Co'
    });

    category = ProductCategoryModel.create({
      name: 'Solar Panels',
      slug: 'solar-panels',
      description: 'Photovoltaic panels'
    });
  });

  test('create product returns with correct fields', () => {
    createdProduct = ProductModel.create({
      vendor_id: vendor.id,
      category_id: category.id,
      name: 'Monocrystalline Solar Panel 400W',
      slug: 'monocrystalline-solar-panel-400w',
      description: 'High efficiency solar panel',
      unit: 'piece',
      base_price: 299.99,
      currency: 'USD',
      carbon_footprint_kg: 150,
      is_green_certified: true,
      stock_qty: 100,
      status: 'active'
    });

    expect(createdProduct).toBeDefined();
    expect(createdProduct.id).toBeDefined();
    expect(createdProduct.name).toBe('Monocrystalline Solar Panel 400W');
    expect(createdProduct.slug).toBe('monocrystalline-solar-panel-400w');
    expect(createdProduct.base_price).toBe(299.99);
    expect(createdProduct.is_green_certified).toBe(1);
    expect(createdProduct.vendor_id).toBe(vendor.id);
    expect(createdProduct.category_id).toBe(category.id);
  });

  test('findById joins vendor and category', () => {
    const found = ProductModel.findById(createdProduct.id);
    expect(found).toBeDefined();
    expect(found.vendor_name).toBe('Product Vendor Co');
    expect(found.category_name).toBe('Solar Panels');
    expect(found.category_slug).toBe('solar-panels');
  });

  test('findByVendor scoped to vendor', () => {
    const result = ProductModel.findByVendor(vendor.id, { page: 1, limit: 10 });
    expect(result.data.length).toBeGreaterThanOrEqual(1);
    expect(result.data[0].vendor_id).toBe(vendor.id);
  });

  test('findAll with green filter returns only green products', () => {
    // Create a non-green product too
    ProductModel.create({
      vendor_id: vendor.id,
      name: 'Regular Cable',
      slug: 'regular-cable',
      unit: 'meter',
      base_price: 5.99,
      is_green_certified: false,
      status: 'active'
    });

    const result = ProductModel.findAll({ is_green_certified: true });
    expect(result.data.length).toBeGreaterThanOrEqual(1);
    result.data.forEach(p => {
      expect(p.is_green_certified).toBe(1);
    });
  });

  test('findAll with search returns matching products', () => {
    const result = ProductModel.findAll({ search: 'solar' });
    expect(result.data.length).toBeGreaterThanOrEqual(1);
    expect(result.data[0].name.toLowerCase()).toContain('solar');
  });

  test('update changes fields', () => {
    const updated = ProductModel.update(createdProduct.id, {
      base_price: 249.99,
      stock_qty: 50
    });

    expect(updated.base_price).toBe(249.99);
    expect(updated.stock_qty).toBe(50);
    expect(updated.updated_at).not.toBe(createdProduct.updated_at);
  });

  test('delete removes product', () => {
    // Create a product to delete
    const toDelete = ProductModel.create({
      vendor_id: vendor.id,
      name: 'Temp Product',
      slug: 'temp-product-to-delete',
      unit: 'piece',
      base_price: 10,
      is_green_certified: false,
      status: 'active'
    });

    ProductModel.delete(toDelete.id);
    const found = ProductModel.findById(toDelete.id);
    expect(found).toBeUndefined();
  });
});
