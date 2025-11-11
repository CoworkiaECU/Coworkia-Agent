// Jest setup file
// Configure global test environment

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.SQLITE_PATH = ':memory:'; // Use in-memory DB for tests
process.env.OPENAI_API_KEY = 'test-key-mock';
process.env.GOOGLE_SERVICE_ACCOUNT_JSON = JSON.stringify({
  client_email: 'test@test.com',
  private_key: 'test-key',
  project_id: 'test-project'
});

// Global test utilities
global.testUtils = {
  createMockUser: (overrides = {}) => ({
    userId: '+593999999999',
    name: 'Test User',
    email: 'test@example.com',
    firstVisit: false,
    freeTrialUsed: false,
    channel: 'whatsapp',
    ...overrides
  }),
  
  createMockReservation: (overrides = {}) => ({
    userId: '+593999999999',
    userName: 'Test User',
    date: '2025-11-12',
    startTime: '09:00',
    endTime: '11:00',
    durationHours: 2,
    serviceType: 'hotDesk',
    totalPrice: 0,
    wasFree: true,
    ...overrides
  })
};
