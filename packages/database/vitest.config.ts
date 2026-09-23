import { DatabaseSync } from "node:sqlite";

export default {
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    pool: "forks",
  },
};
