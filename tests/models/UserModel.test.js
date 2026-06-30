const UserModel = require('../../models/UserModel');

describe('UserModel', () => {
  const testUser = {
    email: 'testuser@example.com',
    password_hash: '$2a$10$dummyhash',
    name: 'Test User',
    role: 'buyer'
  };

  let createdUser;

  test('create user with buyer role', () => {
    createdUser = UserModel.create(testUser);
    expect(createdUser).toBeDefined();
    expect(createdUser.email).toBe(testUser.email);
    expect(createdUser.name).toBe(testUser.name);
    expect(createdUser.role).toBe('buyer');
    expect(createdUser.id).toBeDefined();
    expect(createdUser.is_active).toBe(1);
  });

  test('create user with vendor role', () => {
    const vendor = UserModel.create({
      email: 'vendor@example.com',
      password_hash: '$2a$10$dummyhash',
      name: 'Vendor User',
      role: 'vendor'
    });
    expect(vendor.role).toBe('vendor');
  });

  test('findById returns user', () => {
    const found = UserModel.findById(createdUser.id);
    expect(found).toBeDefined();
    expect(found.email).toBe(testUser.email);
  });

  test('findById returns undefined for non-existent id', () => {
    const found = UserModel.findById('nonexistent-id');
    expect(found).toBeUndefined();
  });

  test('findByEmail returns user', () => {
    const found = UserModel.findByEmail(testUser.email);
    expect(found).toBeDefined();
    expect(found.name).toBe(testUser.name);
  });

  test('findByEmail returns undefined for non-existent email', () => {
    const found = UserModel.findByEmail('nobody@example.com');
    expect(found).toBeUndefined();
  });

  test('update user fields', () => {
    const updated = UserModel.update(createdUser.id, { name: 'Updated Name' });
    expect(updated.name).toBe('Updated Name');
    expect(updated.updated_at).not.toBe(createdUser.updated_at);
  });

  test('findAll returns users with pagination', () => {
    const result = UserModel.findAll({ page: 1, limit: 10 });
    expect(result.rows.length).toBeGreaterThanOrEqual(2);
    expect(result.total).toBeGreaterThanOrEqual(2);
  });

  test('findAll filters by role', () => {
    const result = UserModel.findAll({ role: 'buyer' });
    expect(result.rows.every(u => u.role === 'buyer')).toBe(true);
  });
});
