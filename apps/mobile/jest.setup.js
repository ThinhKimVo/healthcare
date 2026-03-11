// Mock react-native
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: jest.fn((obj) => obj.ios),
  },
  Alert: { alert: jest.fn() },
  StyleSheet: { create: (s) => s },
}));

// Mock expo-secure-store
const secureStoreData = {};
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn((key) => Promise.resolve(secureStoreData[key] || null)),
  setItemAsync: jest.fn((key, value) => {
    secureStoreData[key] = value;
    return Promise.resolve();
  }),
  deleteItemAsync: jest.fn((key) => {
    delete secureStoreData[key];
    return Promise.resolve();
  }),
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 6,
}));

// Mock @react-native-async-storage/async-storage
const asyncStoreData = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((key) => Promise.resolve(asyncStoreData[key] || null)),
    setItem: jest.fn((key, value) => {
      asyncStoreData[key] = value;
      return Promise.resolve();
    }),
    removeItem: jest.fn((key) => {
      delete asyncStoreData[key];
      return Promise.resolve();
    }),
  },
}));

// Mock expo-local-authentication
jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(() => Promise.resolve(true)),
  isEnrolledAsync: jest.fn(() => Promise.resolve(true)),
  supportedAuthenticationTypesAsync: jest.fn(() => Promise.resolve([1])),
  authenticateAsync: jest.fn(() => Promise.resolve({ success: true })),
  AuthenticationType: {
    FINGERPRINT: 1,
    FACIAL_RECOGNITION: 2,
    IRIS: 3,
  },
}));

// Mock expo-device
jest.mock('expo-device', () => ({
  isDevice: true,
}));

// Mock @react-native-firebase/auth
jest.mock('@react-native-firebase/auth', () => {
  const mockAuth = jest.fn(() => ({
    signInWithCredential: jest.fn(),
    signOut: jest.fn(),
  }));
  mockAuth.GoogleAuthProvider = { credential: jest.fn() };
  mockAuth.AppleAuthProvider = { credential: jest.fn() };
  return { __esModule: true, default: mockAuth };
});

// Mock @react-native-google-signin/google-signin
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(() => Promise.resolve(true)),
    signIn: jest.fn(),
    signOut: jest.fn(),
    isSignedIn: jest.fn(() => Promise.resolve(false)),
  },
  statusCodes: {
    SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
    IN_PROGRESS: 'IN_PROGRESS',
    PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
  },
}));

// Mock expo-apple-authentication
jest.mock('expo-apple-authentication', () => ({
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
  signInAsync: jest.fn(),
  AppleAuthenticationScope: {
    FULL_NAME: 0,
    EMAIL: 1,
  },
}));

// Mock expo-crypto
jest.mock('expo-crypto', () => ({
  digestStringAsync: jest.fn(() => Promise.resolve('hashed-nonce')),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
}));

// Suppress console logs in tests
global.__DEV__ = false;
