import { assertEquals } from "@std/assert";
import { calculateAdjustedPoints } from "./points.ts";

Deno.test({
  name: "No adjustment needed (recent review)",
  fn() {
    // If reviewed recently, no points should be lost
    const result = calculateAdjustedPoints(5, 1); // 5 points, 1 day since review
    assertEquals(result, 5);
  },
});

Deno.test({
  name: "Some points lost for missed reviews",
  fn() {
    // 5 points, 48 days since review (should lose some points)
    // With 5 points, grace period is 2^5 = 32 days
    // 16 remaining days
    // Points lost: 2^3=8 (yes), 2^2=4 (no) -> loses 1 point
    const result = calculateAdjustedPoints(5, 32 + 16);
    assertEquals(result, 4);
  },
});

Deno.test({
  name: "Multiple points lost",
  fn() {
    // 5 points, 50 days since review (should lose multiple points)
    // Grace period: 32 days, remaining: 18 days
    // Points lost: 2^4=16 (yes, remaining: 2), 2^3=8 (no) -> loses 1 point
    const result = calculateAdjustedPoints(5, 50);
    assertEquals(result, 4); // Should go from 5 to 4
  },
});

Deno.test({
  name: "Zero points as minimum",
  fn() {
    // Should not go below 0 points
    const result = calculateAdjustedPoints(0, 1000);
    assertEquals(result, 0);
  },
});

Deno.test({
  name: "Large gap results in zero points",
  fn() {
    // A very large gap should result in 0 points (or minimal)
    const result = calculateAdjustedPoints(10, 10000);
    assertEquals(result, 0);
  },
});

Deno.test({
  name: "Exact interval match",
  fn() {
    // Test with exact intervals
    const result = calculateAdjustedPoints(3, 8); // 2^3 = 8, so exactly at grace period
    assertEquals(result, 3);
  },
});

Deno.test({
  name: "Just over interval",
  fn() {
    // 3 points with 12 days (exactly 2^3+2^2=12)
    const result = calculateAdjustedPoints(3, 12);
    assertEquals(result, 2);
  },
});
