const ProductCategoryModel = require('../models/ProductCategoryModel');
const apiResponse = require('../helpers/apiResponse');

module.exports = {
  // GET /api/v1/categories
  listCategories(req, res, next) {
    try {
      const categories = ProductCategoryModel.getTree();
      return apiResponse.success(res, categories);
    } catch (err) { next(err); }
  },

  // GET /api/v1/categories/:id
  getCategory(req, res, next) {
    try {
      const category = ProductCategoryModel.findById(req.params.id);
      if (!category) return apiResponse.notFound(res, 'Category not found');
      return apiResponse.success(res, category);
    } catch (err) { next(err); }
  },

  // POST /api/v1/categories (admin only)
  createCategory(req, res, next) {
    try {
      const { name, slug, description, parent_id } = req.body;
      const existing = ProductCategoryModel.findBySlug(slug);
      if (existing) return apiResponse.validationError(res, [{ msg: 'Slug already exists', param: 'slug' }]);

      const category = ProductCategoryModel.create({ name, slug, description, parent_id });
      return apiResponse.created(res, category, 'Category created');
    } catch (err) { next(err); }
  },

  // PUT /api/v1/categories/:id (admin only)
  updateCategory(req, res, next) {
    try {
      const category = ProductCategoryModel.findById(req.params.id);
      if (!category) return apiResponse.notFound(res, 'Category not found');
      const updated = ProductCategoryModel.update(category.id, req.body);
      return apiResponse.success(res, updated, 'Category updated');
    } catch (err) { next(err); }
  },

  // DELETE /api/v1/categories/:id (admin only)
  deleteCategory(req, res, next) {
    try {
      const category = ProductCategoryModel.findById(req.params.id);
      if (!category) return apiResponse.notFound(res, 'Category not found');
      ProductCategoryModel.delete(category.id);
      return apiResponse.success(res, null, 'Category deleted');
    } catch (err) { next(err); }
  }
};
