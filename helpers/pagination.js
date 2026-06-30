function getPagination(query) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

function paginatedResponse(data, total, page, limit) {
  return {
    data,
    pagination: {
      page, limit, total,
      totalPages: Math.ceil(total / limit)
    }
  };
}

module.exports = { getPagination, paginatedResponse };
