import type { Config } from "jest";
import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  // Path to the Next.js app so next/jest can load next.config.ts / .env files.
  dir: "./",
});

// Custom Jest config passed to next/jest, which merges it with the
// Next.js-specific config (SWC transforms, module mapping, etc).
const config: Config = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testPathIgnorePatterns: ["<rootDir>/.next/", "<rootDir>/node_modules/"],
  collectCoverageFrom: [
    "src/lib/**/*.{ts,tsx}",
    "src/hooks/**/*.{ts,tsx}",
    "src/components/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
  ],
};

export default createJestConfig(config);
