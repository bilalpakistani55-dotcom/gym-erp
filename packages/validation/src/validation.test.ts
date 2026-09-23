import { describe, expect, it } from "vitest";
import { friendlyParse, memberInputSchema } from "./index.js";

describe("validation", () => {
  it("rejects a member without a name using a staff-friendly message", () => {
    expect(() => friendlyParse(memberInputSchema, { fullName: "A", joinDate: "2026-01-01" })).toThrow(
      "Enter the member's full name.",
    );
  });
});
