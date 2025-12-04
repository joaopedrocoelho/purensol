import { describe, it, expect } from "vitest";
import { getThresholds } from "./gifthreshold";

describe("getThresholds", () => {
  it("should parse thresholds from the first stage gift string", () => {
    const label =
      "✦第一階段滿額贈。原礦約2-3m，適合隨身攜帶✦ 滿2500*1、5000*2、7000*3、8500*4";
    const result = getThresholds(label);

    expect(result).toEqual([
      { amount: 2500, gifts: 1 },
      { amount: 5000, gifts: 2 },
      { amount: 7000, gifts: 3 },
      { amount: 8500, gifts: 4 },
    ]);
  });

  it("should parse thresholds from the second stage gift string", () => {
    const label = "✦第二階段滿額贈✦ 滿12000*1、15000*2";
    const result = getThresholds(label);

    expect(result).toEqual([
      { amount: 12000, gifts: 1 },
      { amount: 15000, gifts: 2 },
    ]);
  });

  it("should handle strings with spaces around the asterisk", () => {
    const label = "滿 2500 * 1、5000 * 2";
    const result = getThresholds(label);

    expect(result).toEqual([
      { amount: 2500, gifts: 1 },
      { amount: 5000, gifts: 2 },
    ]);
  });

  it("should handle strings with English commas", () => {
    const label = "滿2500*1, 5000*2, 7000*3";
    const result = getThresholds(label);

    expect(result).toEqual([
      { amount: 2500, gifts: 1 },
      { amount: 5000, gifts: 2 },
      { amount: 7000, gifts: 3 },
    ]);
  });

  it("should return empty array for undefined input", () => {
    const result = getThresholds(undefined);
    expect(result).toEqual([]);
  });

  it("should return empty array for empty string", () => {
    const result = getThresholds("");
    expect(result).toEqual([]);
  });

  it("should return empty array when no thresholds found", () => {
    const result = getThresholds("沒有贈品規則");
    expect(result).toEqual([]);
  });

  it("should sort thresholds by amount in ascending order", () => {
    const label = "滿7000*3、2500*1、8500*4、5000*2";
    const result = getThresholds(label);

    expect(result).toEqual([
      { amount: 2500, gifts: 1 },
      { amount: 5000, gifts: 2 },
      { amount: 7000, gifts: 3 },
      { amount: 8500, gifts: 4 },
    ]);
  });

  it("should handle single threshold", () => {
    const label = "滿1000*1";
    const result = getThresholds(label);

    expect(result).toEqual([{ amount: 1000, gifts: 1 }]);
  });

  it("should ignore invalid patterns", () => {
    const label = "滿2500*1、invalid、5000*2、滿*3";
    const result = getThresholds(label);

    expect(result).toEqual([
      { amount: 2500, gifts: 1 },
      { amount: 5000, gifts: 2 },
    ]);
  });

  it("should handle large numbers", () => {
    const label = "滿100000*5、200000*10";
    const result = getThresholds(label);

    expect(result).toEqual([
      { amount: 100000, gifts: 5 },
      { amount: 200000, gifts: 10 },
    ]);
  });
});
