// __mocks__/firebase-admin.ts
import { jest } from '@jest/globals';

export const mockVerifyIdToken = jest.fn();

export const auth = jest.fn().mockImplementation(() => ({
  verifyIdToken: mockVerifyIdToken,
}));

export const credential = {
  cert: jest.fn(() => ({}))
};

export const initializeApp = jest.fn();
