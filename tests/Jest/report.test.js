//This is an integration test. Testing to see if we are saving a valid report, we get an error if requiered fields are missing & we have access to the saved reports.
import mongoose from "mongoose";
import { Report } from "../../model/reports"; 
import { MongoMemoryServer } from "mongodb-memory-server";

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  
  await mongoose.connection.close();
  await mongoServer.stop();
});

afterEach(async () => {
  await Report.deleteMany({});
});

describe("Report Model", () => {
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
