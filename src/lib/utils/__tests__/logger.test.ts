import { logger } from "@/lib/utils/logger";

describe("logger", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    jest.restoreAllMocks();
    process.env.NODE_ENV = originalNodeEnv;
  });

  it("writes error-level logs via console.error with a level prefix", () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    logger.error("Something broke", { code: 500 });

    expect(errorSpy).toHaveBeenCalledWith("[ERROR]", "Something broke", { code: 500 });
  });

  it("writes warn-level logs via console.warn", () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

    logger.warn("Heads up");

    expect(warnSpy).toHaveBeenCalledWith("[WARN]", "Heads up", "");
  });

  it("writes info-level logs via console.info", () => {
    const infoSpy = jest.spyOn(console, "info").mockImplementation(() => {});

    logger.info("FYI", { detail: "extra" });

    expect(infoSpy).toHaveBeenCalledWith("[INFO]", "FYI", { detail: "extra" });
  });

  it("writes debug-level logs via console.debug outside production", () => {
    process.env.NODE_ENV = "development";
    const debugSpy = jest.spyOn(console, "debug").mockImplementation(() => {});

    logger.debug("debugging");

    expect(debugSpy).toHaveBeenCalledWith("[DEBUG]", "debugging", "");
  });

  it("suppresses debug-level logs in production", () => {
    process.env.NODE_ENV = "production";
    const debugSpy = jest.spyOn(console, "debug").mockImplementation(() => {});

    logger.debug("should not appear");

    expect(debugSpy).not.toHaveBeenCalled();
  });

  it("still logs error/warn/info in production", () => {
    process.env.NODE_ENV = "production";
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    logger.error("prod error");

    expect(errorSpy).toHaveBeenCalledWith("[ERROR]", "prod error", "");
  });
});
