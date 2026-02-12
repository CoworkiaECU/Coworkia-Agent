import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { addPhoto, completeSession, resetUserSession } from '../../src/servicios/axel-photo-collector.js';

// Mock DB repository used inside module
jest.mock('../../src/database/axelPhotoRepository.js', () => ({
  savePhotoSession: jest.fn(() => Promise.resolve({ success: true })),
  getActivePhotoSession: jest.fn(() => Promise.resolve(null)),
  deletePhotoSession: jest.fn(() => Promise.resolve()),
  deleteAllPhotoSessions: jest.fn(() => Promise.resolve())
}));

describe('axel-photo-collector fingerprints', () => {
  const userId = '+19995551234';

  beforeEach(async () => {
    await resetUserSession(userId, { purgeDb: false });
  });

  it('returns a stable sessionFingerprint for a session', async () => {
    const first = await addPhoto(userId, 'https://example.com/a.jpg');
    expect(first.sessionFingerprint).toBeDefined();
    const second = await addPhoto(userId, 'https://example.com/b.jpg');
    expect(second.sessionFingerprint).toEqual(first.sessionFingerprint);

    const completed = await completeSession(userId);
    expect(completed.sessionFingerprint).toEqual(first.sessionFingerprint);
  });
});
