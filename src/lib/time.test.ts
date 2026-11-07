import { describe, expect, it } from "vitest";
import { timeAgo, timeLeft } from "./time";

const NOW = Date.UTC(2026, 10, 6, 12, 0, 0);
const at = (ms: number) => new Date(NOW - ms).toISOString();
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe("timeAgo", () => {
  it("steps through the units", () => {
    expect(timeAgo(at(10_000), NOW)).toBe("just now");
    expect(timeAgo(at(5 * MIN), NOW)).toBe("5 min ago");
    expect(timeAgo(at(3 * HOUR), NOW)).toBe("3 h ago");
    expect(timeAgo(at(1 * DAY), NOW)).toBe("yesterday");
    expect(timeAgo(at(4 * DAY), NOW)).toBe("4 days ago");
  });
  it("falls back to a date after a month and never goes negative", () => {
    expect(timeAgo(at(40 * DAY), NOW)).toMatch(/\d/);
    expect(timeAgo(at(-5 * MIN), NOW)).toBe("just now");
    expect(timeAgo("not a date", NOW)).toBe("");
  });
});

describe("timeLeft", () => {
  it("counts down and reports expiry", () => {
    const ahead = (ms: number) => new Date(NOW + ms).toISOString();
    expect(timeLeft(ahead(30 * MIN), NOW)).toBe("in 30 min");
    expect(timeLeft(ahead(6 * HOUR), NOW)).toBe("in 6 h");
    expect(timeLeft(ahead(7 * DAY), NOW)).toBe("in 7 days");
    expect(timeLeft(ahead(-1), NOW)).toBe("expired");
  });
});
