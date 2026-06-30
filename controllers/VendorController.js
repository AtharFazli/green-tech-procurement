const VendorModel = require('../models/VendorModel');
const apiResponse = require('../helpers/apiResponse');
const { getPagination } = require('../helpers/pagination');

module.exports = {
  // GET /api/v1/vendors/profile — vendor's own profile
  getMyProfile(req, res, next) {
    try {
      const vendor = VendorModel.findByUserId(req.user.id);
      if (!vendor) {
        return apiResponse.notFound(res, 'Vendor profile not found. Create one first.');
      }
      return apiResponse.success(res, vendor);
    } catch (err) { next(err); }
  },

  // POST /api/v1/vendors/profile — create vendor profile
  createProfile(req, res, next) {
    try {
      const existing = VendorModel.findByUserId(req.user.id);
      if (existing) {
        return apiResponse.validationError(res, [{ msg: 'Vendor profile already exists' }]);
      }

      const { company_name, description, website, address, country, tax_id, green_certifications } = req.body;
      const vendor = VendorModel.create({
        user_id: req.user.id,
        company_name, description, website, address, country, tax_id, green_certifications
      });
      return apiResponse.created(res, vendor, 'Vendor profile created');
    } catch (err) { next(err); }
  },

  // PUT /api/v1/vendors/profile — update own profile
  updateProfile(req, res, next) {
    try {
      const vendor = VendorModel.findByUserId(req.user.id);
      if (!vendor) {
        return apiResponse.notFound(res, 'Vendor profile not found');
      }
      const updated = VendorModel.update(vendor.id, req.body);
      return apiResponse.success(res, updated, 'Vendor profile updated');
    } catch (err) { next(err); }
  },

  // GET /api/v1/vendors — public list with filters
  listVendors(req, res, next) {
    try {
      const { page, limit } = getPagination(req.query);
      const { is_approved, country } = req.query;
      const result = VendorModel.findAll({ page, limit, is_approved, country });
      return apiResponse.success(res, result);
    } catch (err) { next(err); }
  },

  // GET /api/v1/vendors/:id — public vendor detail
  getVendor(req, res, next) {
    try {
      const vendor = VendorModel.findById(req.params.id);
      if (!vendor) return apiResponse.notFound(res, 'Vendor not found');
      return apiResponse.success(res, vendor);
    } catch (err) { next(err); }
  }
};
