const jwt = require('jsonwebtoken');

describe('Auth Middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockReq = {
      headers: {},
      cookies: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    mockNext = jest.fn();
  });

  test('should return 401 if no token provided', () => {
    const auth = require('../../middleware/auth');
    auth(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('should return 401 if token is invalid', () => {
    mockReq.headers.authorization = 'Bearer invalid-token-here';

    const auth = require('../../middleware/auth');
    auth(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('should call next with req.user set for valid token', () => {
    const token = jwt.sign(
      { id: 'user-123', email: 'test@example.com', role: 'buyer' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    mockReq.headers.authorization = `Bearer ${token}`;

    const auth = require('../../middleware/auth');
    auth(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockReq.user).toBeDefined();
    expect(mockReq.user.id).toBe('user-123');
    expect(mockReq.user.email).toBe('test@example.com');
    expect(mockReq.user.role).toBe('buyer');
  });

  test('should extract token from cookie', () => {
    const token = jwt.sign(
      { id: 'user-456', email: 'cookie@example.com', role: 'vendor' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    mockReq.cookies.token = token;

    const auth = require('../../middleware/auth');
    auth(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockReq.user).toBeDefined();
    expect(mockReq.user.id).toBe('user-456');
  });
});
