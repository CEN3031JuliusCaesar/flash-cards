// adjust for missed sessions
export function calculateAdjustedPoints(
  originalPoints: number,
  daysSinceLastReview: number,
): number {
  // iterative approach to remove points

  let remainingDays = daysSinceLastReview - Math.pow(2, originalPoints); // Subtract the grace period
  let pointsToLose = 0;

  for (let pointLevel = originalPoints - 1; pointLevel >= 0; pointLevel--) {
    const intervalForThisPoint = Math.pow(2, pointLevel);
    if (remainingDays >= intervalForThisPoint) {
      pointsToLose++;
      remainingDays -= intervalForThisPoint;
    } else {
      // stop when reaching current day.
      break;
    }
  }

  return Math.max(0, originalPoints - pointsToLose);
}
