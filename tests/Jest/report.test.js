//This is an integration test. Testing to see if we are saving a valid report, we get an error if requiered fields are missing & we have access to the saved reports.

// mongoose for MongoDB, the Report model under test, and an in-memory MongoDB for testing
import mongoose from "mongoose";
import { Report } from "../../model/reports"; 
import { MongoMemoryServer } from "mongodb-memory-server";

let mongoServer;

// Before all tests: start an in-memory MongoDB and connect to it (no real database is touched)
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

// After all tests: disconnect and stop the in-memory database
afterAll(async () => {
  
  await mongoose.connection.close();
  await mongoServer.stop();
});

// After each test: delete all reports so tests don't affect each other
afterEach(async () => {
  await Report.deleteMany({});
});

describe("Report Model", () => {
  // Test 1: a report with all required fields is saved and gets an id
  it("should save a valid report", async () => {
    const validReport = new Report({
      name: "Test Report",
      slug: "test-report",
      detail: "This is a test report",
    });

    const savedReport = await validReport.save();

    expect(savedReport._id).toBeDefined();
    expect(savedReport.name).toBe("Test Report");
    expect(savedReport.slug).toBe("test-report");
    expect(savedReport.detail).toBe("This is a test report");
  });

  // Test 2: saving without a name or detail fails with a ValidationError
  it("should throw a validation error if required fields are missing", async () => {
    const invalidReport = new Report({
      slug: "test-report",
    });

    let error;
    try {
      await invalidReport.save();
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.name).toBe("ValidationError");
  });

  // Test 3: saved reports can be read back, in the order they were saved
  it("should allow querying saved reports", async () => {
    const report1 = new Report({ name: "Report 1", slug: "report-1", detail: "Detail 1" });
    const report2 = new Report({ name: "Report 2", slug: "report-2", detail: "Detail 2" });

    await report1.save();
    await report2.save();

    const reports = await Report.find({});
    expect(reports.length).toBe(2);
    expect(reports[0].name).toBe("Report 1");
    expect(reports[1].name).toBe("Report 2");
  });
});
