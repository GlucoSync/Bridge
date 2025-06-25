module.exports = {
  initialize: jest.fn().mockResolvedValue(true),
  getSdkStatus: jest.fn().mockResolvedValue(1),
  requestPermission: jest
    .fn()
    .mockResolvedValue([{ recordType: "BloodGlucose", accessType: "read" }]),
  getGrantedPermissions: jest
    .fn()
    .mockResolvedValue([{ recordType: "BloodGlucose", accessType: "read" }]),
  readRecords: jest.fn().mockResolvedValue({
    records: [
      {
        metadata: { id: "test-1", dataOrigin: "com.freestylelibre.app" },
        level: { inMilligramsPerDeciliter: 120, inMillimolesPerLiter: 6.7 },
        time: "2025-01-01T12:00:00.000Z",
        specimenSource: 1, // capillary_blood
        relationToMeal: 1, // fasting
      },
    ],
  }),
};
