import { toErrorMessage } from "@/lib/auth/errors";

describe("toErrorMessage", () => {
  it("returns message from Error instances", () => {
    expect(toErrorMessage(new Error("boom"))).toBe("boom");
  });

  it("returns fallback for unknown input", () => {
    expect(toErrorMessage({})).toBe("An unexpected error occurred.");
  });
});
