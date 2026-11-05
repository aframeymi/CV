//This is a unit test, checking the databaseconnect function in the db.js. We are using a mock data. first we check to see if there is a correct URI, then the database connection & then detecting errors.

// mongoose (mocked below) and the function under test
import mongoose from "mongoose";
import { databaseconnect } from "../../db";


// Replace mongoose with a fake whose connect() does nothing, so no real database is used
jest.mock("mongoose", () => ({
  connect: jest.fn(),
}));

// Tests for databaseconnect() from db.js
describe("databaseconnect", () => {

  // Spies that capture console.log and console.error calls
  let logSpy, errorSpy;

  // Before each test: reset mocks and silence console output
  beforeEach(() => {
    jest.clearAllMocks(); 
    logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  // After each test: restore the real console functions
  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  // Test 1: connect() is called with the URI that was passed in
  it("should call mongoose.connect with the correct URI", async () => {
    const mockUri = "mongodb://test-uri";
    process.env.MOCK_URI = mockUri; 

    mongoose.connect.mockResolvedValueOnce();

    await databaseconnect(process.env.MOCK_URI); 

    expect(mongoose.connect).toHaveBeenCalledWith(mockUri, expect.any(Object)); 
  });

  // Test 2: 'Database connected' is logged when the connection succeeds
  it("should log 'Database connected' if connection is successful", async () => {
    mongoose.connect.mockResolvedValueOnce(); 

    await databaseconnect(process.env.MOCK_URI); 
    expect(logSpy).toHaveBeenCalledWith("Database connected");
  });

  // Test 3: the error is logged (not thrown) when the connection fails
  it("should log an error if connection fails", async () => {
    const mockError = new Error("Connection failed");

    mongoose.connect.mockRejectedValueOnce(mockError); 
    await databaseconnect(process.env.MOCK_URI); 
    expect(errorSpy).toHaveBeenCalledWith(
      "Error connecting to database:",
      mockError
    );
  });
});
