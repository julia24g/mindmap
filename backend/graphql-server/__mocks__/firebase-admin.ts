import { jest } from "@jest/globals";

export const mockVerifyIdToken =
  jest.fn<() => Promise<{ uid: string; email?: string }>>();

export const auth = jest.fn().mockImplementation(() => ({
  verifyIdToken: mockVerifyIdToken,
}));

export const credential = {
  cert: jest.fn(() => ({})),
};

export const initializeApp = jest.fn();
