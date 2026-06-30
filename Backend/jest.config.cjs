/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src", "<rootDir>/tests"],
  testMatch: ["**/?(*.)+(test|spec).ts"],
  moduleFileExtensions: ["ts", "tsx", "js", "json"],
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        useESM: false,
        tsconfig: {
          module: "CommonJS",
          moduleResolution: "Node",
          target: "ES2022",
          esModuleInterop: true,
          strict: true,
          skipLibCheck: true,
          resolveJsonModule: true,
          types: ["node", "jest"],
        },
      },
    ],
  },
  setupFiles: ["<rootDir>/tests/jest.setup.ts"],
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  // Slow services should not be hit during unit tests
  clearMocks: true,
  collectCoverageFrom: [
    "src/services/**/*.ts",
    "src/repositories/**/*.ts",
    "src/lib/**/*.ts",
    "!src/**/*.d.ts",
  ],
};
