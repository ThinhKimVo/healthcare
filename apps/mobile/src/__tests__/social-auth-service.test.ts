import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import auth from '@react-native-firebase/auth';
import { api } from '../services/api';
import {
  configureGoogleSignIn,
  signInWithGoogle,
  signInWithApple,
  signOutSocial,
  isAppleSignInAvailable,
} from '../services/social-auth';

jest.mock('../services/api', () => ({
  api: {
    post: jest.fn(),
  },
  setLoggingOut: jest.fn(),
}));

const mockApi = api as jest.Mocked<typeof api>;

// Get the shared mock instance for Firebase auth
const mockSignInWithCredential = jest.fn();
const mockSignOut = jest.fn();
(auth as unknown as jest.Mock).mockReturnValue({
  signInWithCredential: mockSignInWithCredential,
  signOut: mockSignOut,
});

describe('Social Auth Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Re-apply auth mock since clearAllMocks resets it
    (auth as unknown as jest.Mock).mockReturnValue({
      signInWithCredential: mockSignInWithCredential,
      signOut: mockSignOut,
    });
  });

  describe('configureGoogleSignIn', () => {
    it('should configure Google Sign-In with web client ID', () => {
      configureGoogleSignIn();
      expect(GoogleSignin.configure).toHaveBeenCalledWith({
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
        offlineAccess: true,
      });
    });
  });

  describe('signInWithGoogle', () => {
    it('should return success with user data on successful sign-in', async () => {
      const mockUser = { id: '1', email: 'google@example.com', role: 'USER' };

      (GoogleSignin.signIn as jest.Mock).mockResolvedValue({
        data: { idToken: 'google-id-token' },
      });

      mockSignInWithCredential.mockResolvedValue({
        user: { getIdToken: jest.fn().mockResolvedValue('firebase-token') },
      });

      mockApi.post.mockResolvedValue({
        data: {
          user: mockUser,
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
        },
      });

      const result = await signInWithGoogle();

      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockUser);
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
    });

    it('should return cancelled when user cancels', async () => {
      const cancelError = { code: statusCodes.SIGN_IN_CANCELLED };
      (GoogleSignin.signIn as jest.Mock).mockRejectedValue(cancelError);

      const result = await signInWithGoogle();

      expect(result.success).toBe(false);
      expect(result.cancelled).toBe(true);
    });

    it('should return error when no ID token received', async () => {
      (GoogleSignin.signIn as jest.Mock).mockResolvedValue({ data: { idToken: null } });

      const result = await signInWithGoogle();

      expect(result.success).toBe(false);
      expect(result.error).toBe('No ID token received from Google');
    });

    it('should handle Play Services not available', async () => {
      const error = { code: statusCodes.PLAY_SERVICES_NOT_AVAILABLE };
      (GoogleSignin.signIn as jest.Mock).mockRejectedValue(error);

      const result = await signInWithGoogle();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Google Play Services not available');
    });

    it('should handle sign-in already in progress', async () => {
      const error = { code: statusCodes.IN_PROGRESS };
      (GoogleSignin.signIn as jest.Mock).mockRejectedValue(error);

      const result = await signInWithGoogle();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Sign-in already in progress');
    });
  });

  describe('signInWithApple', () => {
    beforeEach(() => {
      (require('react-native').Platform as any).OS = 'ios';
      (AppleAuthentication.isAvailableAsync as jest.Mock).mockResolvedValue(true);
    });

    it('should return success on successful Apple sign-in', async () => {
      const mockUser = { id: '1', email: 'apple@example.com', role: 'USER' };

      (AppleAuthentication.signInAsync as jest.Mock).mockResolvedValue({
        identityToken: 'apple-identity-token',
        authorizationCode: 'auth-code',
        fullName: { givenName: 'Tim', familyName: 'Cook' },
      });

      mockSignInWithCredential.mockResolvedValue({
        user: { getIdToken: jest.fn().mockResolvedValue('firebase-token') },
      });

      mockApi.post.mockResolvedValue({
        data: {
          user: mockUser,
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
        },
      });

      const result = await signInWithApple();

      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockUser);
      expect(mockApi.post).toHaveBeenCalledWith('/auth/social', expect.objectContaining({
        provider: 'apple',
        firstName: 'Tim',
        lastName: 'Cook',
      }));
    });

    it('should return error on non-iOS platform', async () => {
      (require('react-native').Platform as any).OS = 'android';

      const result = await signInWithApple();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Apple Sign-In is only available on iOS');
    });

    it('should return cancelled when user cancels', async () => {
      const cancelError = { code: 'ERR_REQUEST_CANCELED' };
      (AppleAuthentication.signInAsync as jest.Mock).mockRejectedValue(cancelError);

      const result = await signInWithApple();

      expect(result.success).toBe(false);
      expect(result.cancelled).toBe(true);
    });

    it('should return error when Apple Sign-In not available', async () => {
      (AppleAuthentication.isAvailableAsync as jest.Mock).mockResolvedValue(false);

      const result = await signInWithApple();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Apple Sign-In is not available on this device');
    });

    it('should return error when no identity token', async () => {
      (AppleAuthentication.signInAsync as jest.Mock).mockResolvedValue({
        identityToken: null,
        authorizationCode: 'code',
      });

      const result = await signInWithApple();

      expect(result.success).toBe(false);
      expect(result.error).toBe('No identity token received from Apple');
    });
  });

  describe('signOutSocial', () => {
    it('should sign out from Firebase and Google', async () => {
      (GoogleSignin.isSignedIn as jest.Mock).mockResolvedValue(true);

      await signOutSocial();

      expect(mockSignOut).toHaveBeenCalled();
      expect(GoogleSignin.signOut).toHaveBeenCalled();
    });

    it('should skip Google sign-out if not signed in', async () => {
      (GoogleSignin.isSignedIn as jest.Mock).mockResolvedValue(false);

      await signOutSocial();

      expect(mockSignOut).toHaveBeenCalled();
      expect(GoogleSignin.signOut).not.toHaveBeenCalled();
    });
  });

  describe('isAppleSignInAvailable', () => {
    it('should return true on iOS when available', async () => {
      (require('react-native').Platform as any).OS = 'ios';
      (AppleAuthentication.isAvailableAsync as jest.Mock).mockResolvedValue(true);

      const result = await isAppleSignInAvailable();
      expect(result).toBe(true);
    });

    it('should return false on Android', async () => {
      (require('react-native').Platform as any).OS = 'android';

      const result = await isAppleSignInAvailable();
      expect(result).toBe(false);
    });
  });
});
