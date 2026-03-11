import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../store/auth';

// Mock the biometric service
jest.mock('../services/biometric', () => ({
  isBiometricEnabled: jest.fn(() => Promise.resolve(false)),
}));

// Mock the auth service
jest.mock('../services/auth', () => ({
  authService: {
    getMe: jest.fn(),
  },
}));

// Mock the api service
jest.mock('../services/api', () => ({
  setLoggingOut: jest.fn(),
}));

const { authService } = require('../services/auth');

describe('Auth Store', () => {
  beforeEach(() => {
    // Reset store to initial state
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: true,
      isLoggingOut: false,
      hasSeenOnboarding: false,
      biometricEnabled: false,
      hasOfferedBiometric: false,
    });

    jest.clearAllMocks();
  });

  describe('Initial state', () => {
    it('should have correct default values', () => {
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(true);
      expect(state.biometricEnabled).toBe(false);
      expect(state.hasSeenOnboarding).toBe(false);
    });
  });

  describe('setUser', () => {
    it('should set user and mark as authenticated', () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        role: 'USER' as const,
        firstName: 'John',
        lastName: 'Doe',
      };

      useAuthStore.getState().setUser(mockUser);

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
    });

    it('should set isAuthenticated false when user is null', () => {
      useAuthStore.getState().setUser(null);

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('setTokens', () => {
    it('should store tokens in SecureStore and state', async () => {
      await useAuthStore.getState().setTokens('access-123', 'refresh-456');

      const state = useAuthStore.getState();
      expect(state.accessToken).toBe('access-123');
      expect(state.refreshToken).toBe('refresh-456');
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('accessToken', 'access-123');
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('refreshToken', 'refresh-456');
    });
  });

  describe('logout', () => {
    it('should clear user, tokens, and auth state', async () => {
      // Set up authenticated state
      useAuthStore.setState({
        user: { id: '1', email: 'test@example.com', role: 'USER' },
        accessToken: 'token',
        refreshToken: 'refresh',
        isAuthenticated: true,
      });

      await useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('should delete tokens from SecureStore', async () => {
      await useAuthStore.getState().logout();

      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('accessToken');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('refreshToken');
    });

    it('should set logging out flag on api', async () => {
      const { setLoggingOut } = require('../services/api');

      await useAuthStore.getState().logout();

      expect(setLoggingOut).toHaveBeenCalledWith(true);
      expect(setLoggingOut).toHaveBeenCalledWith(false);
    });
  });

  describe('loadStoredAuth', () => {
    it('should load tokens and validate with API', async () => {
      const mockUser = { id: '1', email: 'test@example.com', role: 'USER' };

      (SecureStore.getItemAsync as jest.Mock)
        .mockImplementation((key: string) => {
          if (key === 'accessToken') return Promise.resolve('stored-access');
          if (key === 'refreshToken') return Promise.resolve('stored-refresh');
          return Promise.resolve(null);
        });

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      authService.getMe.mockResolvedValue(mockUser);

      await useAuthStore.getState().loadStoredAuth();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toEqual(mockUser);
      expect(state.isLoading).toBe(false);
    });

    it('should clear auth when token validation fails', async () => {
      (SecureStore.getItemAsync as jest.Mock)
        .mockImplementation((key: string) => {
          if (key === 'accessToken') return Promise.resolve('expired-token');
          if (key === 'refreshToken') return Promise.resolve('expired-refresh');
          return Promise.resolve(null);
        });

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      authService.getMe.mockRejectedValue(new Error('Unauthorized'));

      await useAuthStore.getState().loadStoredAuth();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.isLoading).toBe(false);
    });

    it('should set isLoading false when no tokens stored', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      await useAuthStore.getState().loadStoredAuth();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
    });

    it('should load onboarding and biometric flags', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.getItem as jest.Mock)
        .mockImplementation((key: string) => {
          if (key === 'hasSeenOnboarding') return Promise.resolve('true');
          if (key === 'hasOfferedBiometric') return Promise.resolve('true');
          return Promise.resolve(null);
        });

      await useAuthStore.getState().loadStoredAuth();

      const state = useAuthStore.getState();
      expect(state.hasSeenOnboarding).toBe(true);
      expect(state.hasOfferedBiometric).toBe(true);
    });
  });

  describe('completeOnboarding', () => {
    it('should set hasSeenOnboarding and persist to AsyncStorage', async () => {
      await useAuthStore.getState().completeOnboarding();

      const state = useAuthStore.getState();
      expect(state.hasSeenOnboarding).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('hasSeenOnboarding', 'true');
    });
  });

  describe('setHasOfferedBiometric', () => {
    it('should persist biometric offer flag', async () => {
      await useAuthStore.getState().setHasOfferedBiometric(true);

      const state = useAuthStore.getState();
      expect(state.hasOfferedBiometric).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('hasOfferedBiometric', 'true');
    });
  });
});
