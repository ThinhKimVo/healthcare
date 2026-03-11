import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import {
  isBiometricAvailable,
  getBiometricType,
  getBiometricName,
  getBiometricStatus,
  isBiometricEnabled,
  enableBiometric,
  disableBiometric,
  getCredentialsWithBiometric,
  updateBiometricCredentials,
  clearBiometricData,
} from '../services/biometric';

const mockHasHardware = LocalAuthentication.hasHardwareAsync as jest.Mock;
const mockIsEnrolled = LocalAuthentication.isEnrolledAsync as jest.Mock;
const mockSupportedTypes = LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock;
const mockAuthenticate = LocalAuthentication.authenticateAsync as jest.Mock;

describe('Biometric Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Platform as any).OS = 'ios';
    mockHasHardware.mockResolvedValue(true);
    mockIsEnrolled.mockResolvedValue(true);
    mockSupportedTypes.mockResolvedValue([LocalAuthentication.AuthenticationType.FINGERPRINT]);
    mockAuthenticate.mockResolvedValue({ success: true });
  });

  describe('isBiometricAvailable', () => {
    it('should return true when hardware and enrollment available', async () => {
      const result = await isBiometricAvailable();
      expect(result).toBe(true);
    });

    it('should return false when no hardware', async () => {
      mockHasHardware.mockResolvedValue(false);
      const result = await isBiometricAvailable();
      expect(result).toBe(false);
    });

    it('should return false when not enrolled', async () => {
      mockIsEnrolled.mockResolvedValue(false);
      const result = await isBiometricAvailable();
      expect(result).toBe(false);
    });

    it('should return false when no supported types', async () => {
      mockSupportedTypes.mockResolvedValue([]);
      const result = await isBiometricAvailable();
      expect(result).toBe(false);
    });
  });

  describe('getBiometricType', () => {
    it('should return fingerprint when supported', async () => {
      mockSupportedTypes.mockResolvedValue([LocalAuthentication.AuthenticationType.FINGERPRINT]);
      const result = await getBiometricType();
      expect(result).toBe('fingerprint');
    });

    it('should return facial on iOS when Face ID supported', async () => {
      (Platform as any).OS = 'ios';
      mockSupportedTypes.mockResolvedValue([LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION]);
      const result = await getBiometricType();
      expect(result).toBe('facial');
    });

    it('should return none when no hardware', async () => {
      mockHasHardware.mockResolvedValue(false);
      const result = await getBiometricType();
      expect(result).toBe('none');
    });

    it('should return none when not enrolled', async () => {
      mockIsEnrolled.mockResolvedValue(false);
      const result = await getBiometricType();
      expect(result).toBe('none');
    });

    it('should prioritize fingerprint on Android', async () => {
      (Platform as any).OS = 'android';
      mockSupportedTypes.mockResolvedValue([
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
        LocalAuthentication.AuthenticationType.FINGERPRINT,
      ]);
      const result = await getBiometricType();
      expect(result).toBe('fingerprint');
    });

    it('should prioritize Face ID on iOS', async () => {
      (Platform as any).OS = 'ios';
      mockSupportedTypes.mockResolvedValue([
        LocalAuthentication.AuthenticationType.FINGERPRINT,
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
      ]);
      const result = await getBiometricType();
      expect(result).toBe('facial');
    });
  });

  describe('getBiometricName', () => {
    it('should return Face ID for facial on iOS', () => {
      (Platform as any).OS = 'ios';
      expect(getBiometricName('facial')).toBe('Face ID');
    });

    it('should return Touch ID for fingerprint on iOS', () => {
      (Platform as any).OS = 'ios';
      expect(getBiometricName('fingerprint')).toBe('Touch ID');
    });

    it('should return Face Unlock for facial on Android', () => {
      (Platform as any).OS = 'android';
      expect(getBiometricName('facial')).toBe('Face Unlock');
    });

    it('should return Fingerprint for fingerprint on Android', () => {
      (Platform as any).OS = 'android';
      expect(getBiometricName('fingerprint')).toBe('Fingerprint');
    });

    it('should return Biometric for none type', () => {
      expect(getBiometricName('none')).toBe('Biometric');
    });
  });

  describe('isBiometricEnabled', () => {
    it('should return true when enabled in SecureStore', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('true');
      const result = await isBiometricEnabled();
      expect(result).toBe(true);
    });

    it('should return false when not enabled', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
      const result = await isBiometricEnabled();
      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockRejectedValue(new Error('fail'));
      const result = await isBiometricEnabled();
      expect(result).toBe(false);
    });
  });

  describe('enableBiometric', () => {
    it('should store credentials after successful authentication', async () => {
      const credentials = { email: 'test@example.com', password: 'pass123' };

      const result = await enableBiometric(credentials);

      expect(result).toBe(true);
      expect(mockAuthenticate).toHaveBeenCalled();
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'biometric_credentials',
        JSON.stringify(credentials),
        expect.any(Object)
      );
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('biometric_enabled', 'true');
    });

    it('should return false when biometric auth fails', async () => {
      mockAuthenticate.mockResolvedValue({ success: false });

      const result = await enableBiometric({ email: 'test@example.com', password: 'pass' });

      expect(result).toBe(false);
    });
  });

  describe('disableBiometric', () => {
    it('should delete credentials and set enabled to false', async () => {
      await disableBiometric();

      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('biometric_credentials');
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('biometric_enabled', 'false');
    });
  });

  describe('getCredentialsWithBiometric', () => {
    it('should return credentials after successful auth', async () => {
      const storedCreds = { email: 'test@example.com', password: 'pass123' };
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify(storedCreds));

      const result = await getCredentialsWithBiometric();

      expect(mockAuthenticate).toHaveBeenCalled();
      expect(result).toEqual(storedCreds);
    });

    it('should return null when auth fails', async () => {
      mockAuthenticate.mockResolvedValue({ success: false });

      const result = await getCredentialsWithBiometric();

      expect(result).toBeNull();
    });

    it('should return null when no credentials stored', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      const result = await getCredentialsWithBiometric();

      expect(result).toBeNull();
    });
  });

  describe('updateBiometricCredentials', () => {
    it('should update credentials when biometric is enabled', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('true');
      const newCreds = { email: 'test@example.com', password: 'newpass' };

      const result = await updateBiometricCredentials(newCreds);

      expect(result).toBe(true);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'biometric_credentials',
        JSON.stringify(newCreds),
        expect.any(Object)
      );
    });

    it('should return false when biometric is not enabled', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      const result = await updateBiometricCredentials({
        email: 'test@example.com',
        password: 'pass',
      });

      expect(result).toBe(false);
    });
  });

  describe('clearBiometricData', () => {
    it('should delete credentials but keep enabled flag', async () => {
      await clearBiometricData();

      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('biometric_credentials');
      expect(SecureStore.deleteItemAsync).not.toHaveBeenCalledWith('biometric_enabled');
    });
  });

  describe('getBiometricStatus', () => {
    it('should return complete status object', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('true');

      const status = await getBiometricStatus();

      expect(status).toEqual({
        isAvailable: true,
        isEnabled: true,
        biometricType: 'fingerprint',
        biometricName: expect.any(String),
      });
    });

    it('should mark as unavailable when no hardware', async () => {
      mockHasHardware.mockResolvedValue(false);

      const status = await getBiometricStatus();

      expect(status.isAvailable).toBe(false);
      expect(status.biometricType).toBe('none');
    });
  });
});
