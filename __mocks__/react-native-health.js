module.exports = {
  initHealthKit: jest.fn((options, callback) => callback(null, {})),
  Constants: {
    Permissions: {
      BloodGlucose: "bloodGlucose",
    },
  },
  getAuthStatus: jest.fn((options, callback) =>
    callback(null, {
      permissions: {
        read: [{ permission: "bloodGlucose", granted: true }],
      },
    })
  ),
  getBloodGlucoseSamples: jest.fn((options, callback) =>
    callback(null, [
      {
        id: "test-1",
        value: 120,
        startDate: "2025-01-01T12:00:00.000Z",
        endDate: "2025-01-01T12:00:00.000Z",
        sourceName: "TestDevice",
        metadata: {},
      },
    ])
  ),
};
