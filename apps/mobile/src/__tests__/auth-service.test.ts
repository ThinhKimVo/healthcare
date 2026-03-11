import { api } from '../services/api';
import {
  login,
  register,
  refreshToken,
  getMe,
  forgotPassword,
  verifyOtp,
  resetPassword,
  resendOtp,
  verifyPhone,
  verifyEmail,
  changePassword,
  socialAuth,
} from '../services/auth';

// Mock the api module
jest.mock('../services/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
  },
  setLoggingOut: jest.fn(),
}));

const mockApi = api as jest.Mocked<typeof api>;

describe('Auth Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should call POST /auth/login with credentials', async () => {
      const mockResponse = {
        data: {
          user: { id: '1', email: 'test@example.com', role: 'USER' },
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
        },
      };
      mockApi.post.mockResolvedValue(mockResponse);

      const result = await login('test@example.com', 'password123');

      expect(mockApi.post).toHaveBeenCalledWith('/auth/login', {
        email: 'test@example.com',
        password: 'password123',
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should return requiresVerification when phone not verified', async () => {
      const mockResponse = {
        data: {
          user: { id: '1', email: 'test@example.com', phone: '+1234567890', role: 'USER' },
          requiresVerification: true,
        },
      };
      mockApi.post.mockResolvedValue(mockResponse);

      const result = await login('test@example.com', 'password');

      expect(result.requiresVerification).toBe(true);
      expect(result.user?.phone).toBe('+1234567890');
    });

    it('should throw on invalid credentials', async () => {
      mockApi.post.mockRejectedValue(new Error('Invalid credentials'));

      await expect(login('bad@email.com', 'wrong')).rejects.toThrow('Invalid credentials');
    });
  });

  describe('register', () => {
    it('should call POST /auth/register with user data', async () => {
      const registerData = {
        email: 'new@example.com',
        password: 'StrongP@ss123',
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'USER' as const,
      };
      const mockResponse = {
        data: {
          user: { id: '2', email: 'new@example.com', role: 'USER' },
          requiresVerification: true,
        },
      };
      mockApi.post.mockResolvedValue(mockResponse);

      const result = await register(registerData);

      expect(mockApi.post).toHaveBeenCalledWith('/auth/register', registerData);
      expect(result.user.email).toBe('new@example.com');
    });

    it('should register a therapist', async () => {
      const registerData = {
        email: 'therapist@example.com',
        password: 'StrongP@ss123',
        firstName: 'Dr',
        lastName: 'Smith',
        role: 'THERAPIST' as const,
      };
      mockApi.post.mockResolvedValue({
        data: { user: { id: '3', email: 'therapist@example.com', role: 'THERAPIST' } },
      });

      const result = await register(registerData);

      expect(result.user.role).toBe('THERAPIST');
    });
  });

  describe('refreshToken', () => {
    it('should call POST /auth/refresh with bearer token', async () => {
      mockApi.post.mockResolvedValue({
        data: { accessToken: 'new-access', refreshToken: 'new-refresh' },
      });

      const result = await refreshToken('old-refresh');

      expect(mockApi.post).toHaveBeenCalledWith('/auth/refresh', null, {
        headers: { Authorization: 'Bearer old-refresh' },
      });
      expect(result.accessToken).toBe('new-access');
      expect(result.refreshToken).toBe('new-refresh');
    });
  });

  describe('getMe', () => {
    it('should call GET /auth/me', async () => {
      const mockUser = { id: '1', email: 'test@example.com', role: 'USER' };
      mockApi.get.mockResolvedValue({ data: mockUser });

      const result = await getMe();

      expect(mockApi.get).toHaveBeenCalledWith('/auth/me');
      expect(result).toEqual(mockUser);
    });
  });

  describe('forgotPassword', () => {
    it('should call POST /auth/forgot-password with email', async () => {
      mockApi.post.mockResolvedValue({ data: { message: 'OTP sent' } });

      const result = await forgotPassword('test@example.com');

      expect(mockApi.post).toHaveBeenCalledWith('/auth/forgot-password', {
        email: 'test@example.com',
      });
      expect(result.message).toBe('OTP sent');
    });
  });

  describe('verifyOtp', () => {
    it('should call POST /auth/verify-otp with email and code', async () => {
      mockApi.post.mockResolvedValue({
        data: {
          verified: true,
          user: { id: '1', email: 'test@example.com', role: 'USER' },
          accessToken: 'token',
          refreshToken: 'refresh',
        },
      });

      const result = await verifyOtp('test@example.com', '123456');

      expect(mockApi.post).toHaveBeenCalledWith('/auth/verify-otp', {
        email: 'test@example.com',
        otp: '123456',
      });
      expect(result.verified).toBe(true);
    });
  });

  describe('resetPassword', () => {
    it('should call POST /auth/reset-password', async () => {
      mockApi.post.mockResolvedValue({ data: { message: 'Password reset' } });

      const result = await resetPassword('test@example.com', '123456', 'NewP@ss123');

      expect(mockApi.post).toHaveBeenCalledWith('/auth/reset-password', {
        email: 'test@example.com',
        otp: '123456',
        newPassword: 'NewP@ss123',
      });
      expect(result.message).toBe('Password reset');
    });
  });

  describe('resendOtp', () => {
    it('should call POST /auth/resend-otp', async () => {
      mockApi.post.mockResolvedValue({ data: { message: 'OTP resent' } });

      const result = await resendOtp('test@example.com');

      expect(mockApi.post).toHaveBeenCalledWith('/auth/resend-otp', {
        email: 'test@example.com',
      });
      expect(result.message).toBe('OTP resent');
    });
  });

  describe('verifyPhone', () => {
    it('should call POST /auth/verify-phone with idToken', async () => {
      mockApi.post.mockResolvedValue({
        data: {
          user: { id: '1', email: 'test@example.com', role: 'USER' },
          accessToken: 'token',
          refreshToken: 'refresh',
        },
      });

      const result = await verifyPhone('firebase-id-token', 'user-1');

      expect(mockApi.post).toHaveBeenCalledWith('/auth/verify-phone', {
        idToken: 'firebase-id-token',
        userId: 'user-1',
      });
      expect(result.accessToken).toBe('token');
    });
  });

  describe('verifyEmail', () => {
    it('should call POST /auth/verify-email with idToken', async () => {
      mockApi.post.mockResolvedValue({
        data: {
          user: { id: '1', email: 'test@example.com', role: 'USER' },
        },
      });

      const result = await verifyEmail('firebase-id-token', 'user-1');

      expect(mockApi.post).toHaveBeenCalledWith('/auth/verify-email', {
        idToken: 'firebase-id-token',
        userId: 'user-1',
      });
    });
  });

  describe('changePassword', () => {
    it('should call POST /auth/change-password', async () => {
      mockApi.post.mockResolvedValue({ data: { message: 'Password changed' } });

      const result = await changePassword('OldP@ss123', 'NewP@ss456');

      expect(mockApi.post).toHaveBeenCalledWith('/auth/change-password', {
        currentPassword: 'OldP@ss123',
        newPassword: 'NewP@ss456',
      });
      expect(result.message).toBe('Password changed');
    });
  });

  describe('socialAuth', () => {
    it('should call POST /auth/social for Google', async () => {
      mockApi.post.mockResolvedValue({
        data: {
          user: { id: '1', email: 'google@example.com', role: 'USER' },
          accessToken: 'token',
          refreshToken: 'refresh',
          isNewUser: false,
        },
      });

      const result = await socialAuth('google', 'firebase-token');

      expect(mockApi.post).toHaveBeenCalledWith('/auth/social', {
        provider: 'google',
        idToken: 'firebase-token',
      });
      expect(result.user.email).toBe('google@example.com');
    });

    it('should call POST /auth/social for Apple with name data', async () => {
      mockApi.post.mockResolvedValue({
        data: {
          user: { id: '2', email: 'apple@example.com', role: 'USER' },
          accessToken: 'token',
          refreshToken: 'refresh',
          isNewUser: true,
        },
      });

      const result = await socialAuth('apple', 'firebase-token', {
        firstName: 'Tim',
        lastName: 'Cook',
      });

      expect(mockApi.post).toHaveBeenCalledWith('/auth/social', {
        provider: 'apple',
        idToken: 'firebase-token',
        firstName: 'Tim',
        lastName: 'Cook',
      });
      expect(result.isNewUser).toBe(true);
    });
  });
});
