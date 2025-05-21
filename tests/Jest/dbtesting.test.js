import mongoose from "mongoose";
import { databaseconnect } from "../../db";

jest.mock("mongoose", () => ({
  connect: jest.fn(),
}));

describe("databaseconnect", () => {
  let logSpy, errorSpy;

  beforeEach(() => {
    jest.clearAllMocks(); 
    logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("should call mongoose.connect with the correct URI", async () => {
    const mockUri = "mongodb://test-uri";
    process.env.MOCK_URI = mockUri; 

    mongoose.connect.mockResolvedValueOnce();

    await databaseconnect(process.env.MOCK_URI); 

    expect(mongoose.connect).toHaveBeenCalledWith(mockUri, expect.any(Object)); 
  });

  it("should log 'Database connected' if connection is successful", async () => {
    mongoose.connect.mockResolvedValueOnce(); 

    await databaseconnect(process.env.MOCK_URI); 
    expect(logSpy).toHaveBeenCalledWith("Database connected");
  });

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
