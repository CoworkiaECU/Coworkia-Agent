import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { addPhoto, completeSession, resetUserSession, startTimeout, getSession } from '../../src/servicios/axel-photo-collector.js';

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

  it('keeps session when DB backup fails', async () => {
    const response = await addPhoto(userId, 'https://example.com/a.jpg');

    expect(response.currentCount).toBe(1);
  });

  it('caps at 4 photos and marks ready', async () => {
    await addPhoto(userId, 'https://example.com/1.jpg');
    await addPhoto(userId, 'https://example.com/2.jpg');
    await addPhoto(userId, 'https://example.com/3.jpg');
    const fourth = await addPhoto(userId, 'https://example.com/4.jpg');

    expect(fourth.currentCount).toBe(4);
    expect(fourth.canAddMore).toBe(false);
    expect(fourth.isReady).toBe(true);

    const fifth = await addPhoto(userId, 'https://example.com/5.jpg');
    expect(fifth.currentCount).toBe(4);
    expect(fifth.canAddMore).toBe(false);
  });

  it('starts timeout and flags readyToProcess', async () => {
    jest.useFakeTimers();
    const onTimeout = jest.fn();

    await addPhoto(userId, 'https://example.com/timeout.jpg');
    startTimeout(userId, onTimeout);

    jest.advanceTimersByTime(20000);
    jest.runOnlyPendingTimers();

    const session = await getSession(userId);
    expect(session.readyToProcess).toBe(true);
    expect(onTimeout).toHaveBeenCalledTimes(1);

    jest.useRealTimers();
  });
});
