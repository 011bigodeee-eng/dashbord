/** Carry sub-second time across frequent autosaves; paused intervals never count. */
export function workoutClock(
  run: {
    status: string;
    activeSeconds: number;
    updatedAt: Date;
    state: unknown;
  },
  now = Date.now(),
) {
  const state = run.state;
  const stored =
    state &&
    typeof state === "object" &&
    "clockRemainderMs" in state &&
    typeof state.clockRemainderMs === "number"
      ? state.clockRemainderMs
      : 0;
  const remainder = Math.max(0, Math.min(999, Math.floor(stored)));
  const total =
    run.activeSeconds * 1000 +
    remainder +
    (run.status === "IN_PROGRESS"
      ? Math.max(0, now - run.updatedAt.getTime())
      : 0);
  return { seconds: Math.floor(total / 1000), remainderMs: total % 1000 };
}
