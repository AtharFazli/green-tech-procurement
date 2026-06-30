const ProductModel = require('../models/ProductModel');
const VendorModel = require('../models/VendorModel');
const apiResponse = require('../helpers/apiResponse');
const { getPagination } = require('../helpers/pagination');

module.exports = {
  // GET /api/v1/products — public browse with filters
  listProducts(req, res, next) {
    try {
      const { page, limit } = getPagination(req.query);
      const { category_id, vendor_id, is_green_certified, search, sort_by, sort_dir } = req.query;

      const greenFilter = is_green_certified !== undefined ? is_green_certified === 'true' : undefined;

      const result = ProductModel.findAll({
        page, limit,
        category_id: category_id || undefined,
        vendor_id: vendor_id || undefined,
        is_green_certified: greenFilter,
        status: 'active',
        search: search || undefined,
        sort_by: sort_by || undefined,
        sort_dir: sort_dir || undefined
      });
      return apiResponse.success(res, result);
    } catch (err) { next(err); }
  },

  // GET /api/v1/products/:id
  getProduct(req, res, next) {
    try {
      const product = ProductModel.findById(req.params.id);
      if (!product) return apiResponse.notFound(res, 'Product not found');
      return apiResponse.success(res, product);
    } catch (err) { next(err); }
  },

  // GET /api/v1/products/me — vendor's own products
  getMyProducts(req, res, next) {
    try {
      const vendor = VendorModel.findByUserId(req.user.id);
      if (!vendor) return apiResponse.notFound(res, 'Create vendor profile first');

      const { page, limit } = getPagination(req.query);
      const result = ProductModel.findByVendor(vendor.id, { page, limit, status: req.query.status });
      return apiResponse.success(res, result);
    } catch (err) { next(err); }
  },

  // POST /api/v1/products/me — vendor creates product
  createProduct(req, res, next) {
    try {
      const vendor = VendorModel.findByUserId(req.user.id);
      if (!vendor) return apiResponse.notFound(res, 'Create vendor profile first');

      const { name, slug, description, unit, base_price, currency, category_id, carbon_footprint_kg, is_green_certified, stock_qty } = req.body;

      const product = ProductModel.create({
        vendor_id: vendor.id,
        category_id, name, slug, description, unit, base_price, currency, carbon_footprint_kg,
        is_green_certified: is_green_certified || false,
        stock_qty: stock_qty || 0,
        status: 'active'
      });
      return apiResponse.created(res, product, 'Product created');
    } catch (err) { next(err); }
  },

  // PUT /api/v1/products/me/:id — vendor updates own product
  updateProduct(req, res, next) {
    try {
      const vendor = VendorModel.findByUserId(req.user.id);
      if (!vendor) return apiResponse.notFound(res, 'Create vendor profile first');

      const product = ProductModel.findById(req.params.id);
      if (!product) return apiResponse.notFound(res, 'Product not found');
      if (product.vendor_id !== vendor.id) return apiResponse.forbidden(res);

      const updated = ProductModel.update(product.id, req.body);
      return apiResponse.success(res, updated, 'Product updated');
    } catch (err) { next(err); }
  },

  // DELETE /api/v1/products/me/:id
  deleteProduct(req, res, next) {
    try {
      const vendor = VendorModel.findByUserId(req.user.id);
      if (!vendor) return apiResponse.notFound(res, 'Create vendor profile first');

      const product = ProductModel.findById(req.params.id);
      if (!product) return apiResponse.notFound(res, 'Product not found');
      if (product.vendor_id !== vendor.id) return apiResponse.forbidden(res);

      ProductModel.delete(product.id);
      return apiResponse.success(res, null, 'Product deleted');
    } catch (err) { next(err); }
  }
};
