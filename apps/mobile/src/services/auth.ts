import { api } from './api';

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    role: 'USER' | 'THERAPIST' | 'ADMIN';
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
  };
  accessToken: string;
  refreshToken: string;
}

export interface RegisterRequest {
  email: string;
  phone?: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: 'USER' | 'THERAPIST';
}

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  async register(data: RegisterRequest): Promise<LoginResponse> {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const response = await api.post('/auth/refresh', null, {
      headers: { Authorization: `Bearer ${refreshToken}` },
    });
    return response.data;
  },

  async getMe(): Promise<LoginResponse['user']> {
    const response = await api.get('/auth/me');
    return response.data;
  },

  async forgotPassword(email: string): Promise<{ message: string }> {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  async verifyOtp(email: string, otp: string): Promise<{ token: string }> {
    const response = await api.post('/auth/verify-otp', { email, otp });
    return response.data;
  },

  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    const response = await api.post('/auth/reset-password', { token, password });
    return response.data;
  },
};
