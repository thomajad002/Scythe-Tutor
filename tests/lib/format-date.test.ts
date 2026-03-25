import { formatIsoDate } from "@/lib/utils/format-date";

describe("formatIsoDate", () => {
  it("returns placeholder for missing values", () => {
    expect(formatIsoDate(null)).toBe("Not available");
  });

  it("returns invalid for invalid date", () => {
    expect(formatIsoDate("not-a-date")).toBe("Invalid date");
  });

  it("formats valid dates", () => {
    const result = formatIsoDate("2026-02-25T15:10:00.000Z");

    expect(result).toContain("2026");
  });
});
