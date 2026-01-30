export const requireUser = jest.fn(() => ({
  id: "1",
  firebaseUid: "test-firebase-uid",
  email: "test@example.com",
}));

export default { requireUser };
