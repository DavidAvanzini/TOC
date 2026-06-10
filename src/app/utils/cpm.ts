import { Activity, Milestone, ConsistencyIssue } from '../types';

export function checkConsistency(
  milestones: Milestone[],
  activities: Activity[],
  paths: { id: string; name: string }[]
): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = [];
  const milestoneIds = new Set(milestones.map(m => m.id));
  const pathIds = new Set(paths.map(p => p.id));

  for (const act of activities) {
    if (!milestoneIds.has(act.fromMilestoneId)) {
      issues.push({ type: 'error', message: `Activity "${act.name}" references missing start milestone.`, relatedId: act.id });
    }
    if (!milestoneIds.has(act.toMilestoneId)) {
      issues.push({ type: 'error', message: `Activity "${act.name}" references missing end milestone.`, relatedId: act.id });
    }
    if (!pathIds.has(act.pathId)) {
      issues.push({ type: 'error', message: `Activity "${act.name}" references missing path.`, relatedId: act.id });
    }
    if (act.fromMilestoneId === act.toMilestoneId) {
      issues.push({ type: 'error', message: `Activity "${act.name}" starts and ends at the same milestone.`, relatedId: act.id });
    }
    if (act.duration <= 0) {
      issues.push({ type: 'warning', message: `Activity "${act.name}" has a non-positive duration.`, relatedId: act.id });
    }
  }

  // Detect cycles using DFS
  const adj = new Map<string, string[]>();
  for (const m of milestones) adj.set(m.id, []);
  for (const act of activities) {
    if (milestoneIds.has(act.fromMilestoneId) && milestoneIds.has(act.toMilestoneId)) {
      adj.get(act.fromMilestoneId)!.push(act.toMilestoneId);
    }
  }
  const visited = new Set<string>();
  const inStack = new Set<string>();

  function hasCycle(node: string): boolean {
    visited.add(node);
    inStack.add(node);
    for (const neighbor of (adj.get(node) ?? [])) {
      if (!visited.has(neighbor) && hasCycle(neighbor)) return true;
      if (inStack.has(neighbor)) return true;
    }
    inStack.delete(node);
    return false;
  }

  for (const m of milestones) {
    if (!visited.has(m.id) && hasCycle(m.id)) {
      issues.push({ type: 'error', message: 'Cycle detected in the network. CPM requires a directed acyclic graph.' });
      break;
    }
  }

  // Check for disconnected milestones
  for (const m of milestones) {
    const hasIn = activities.some(a => a.toMilestoneId === m.id);
    const hasOut = activities.some(a => a.fromMilestoneId === m.id);
    if (!hasIn && !hasOut && milestones.length > 1) {
      issues.push({ type: 'warning', message: `Milestone "${m.name}" is isolated (no activities connected).`, relatedId: m.id });
    }
  }

  return issues;
}

export function computeCPM(
  milestones: Milestone[],
  activities: Activity[]
): Activity[] {
  if (milestones.length === 0 || activities.length === 0) return activities;

  const milestoneIds = new Set(milestones.map(m => m.id));
  const validActs = activities.filter(
    a => milestoneIds.has(a.fromMilestoneId) && milestoneIds.has(a.toMilestoneId) && a.fromMilestoneId !== a.toMilestoneId
  );

  // Topological sort of milestones
  const inDeg = new Map<string, number>();
  const adj = new Map<string, string[]>();
  for (const m of milestones) { inDeg.set(m.id, 0); adj.set(m.id, []); }
  for (const a of validActs) {
    adj.get(a.fromMilestoneId)!.push(a.toMilestoneId);
    inDeg.set(a.toMilestoneId, (inDeg.get(a.toMilestoneId) ?? 0) + 1);
  }

  const queue: string[] = [];
  for (const [id, deg] of inDeg) if (deg === 0) queue.push(id);
  const order: string[] = [];
  while (queue.length) {
    const node = queue.shift()!;
    order.push(node);
    for (const next of (adj.get(node) ?? [])) {
      const d = (inDeg.get(next) ?? 1) - 1;
      inDeg.set(next, d);
      if (d === 0) queue.push(next);
    }
  }

  // Forward pass — earliest finish for each milestone
  const earlyTime = new Map<string, number>();
  for (const id of order) earlyTime.set(id, 0);
  for (const id of order) {
    const t = earlyTime.get(id) ?? 0;
    for (const a of validActs.filter(a => a.fromMilestoneId === id)) {
      const cur = earlyTime.get(a.toMilestoneId) ?? 0;
      earlyTime.set(a.toMilestoneId, Math.max(cur, t + a.duration));
    }
  }

  const projectEnd = Math.max(0, ...Array.from(earlyTime.values()));

  // Backward pass — latest start for each milestone
  const lateTime = new Map<string, number>();
  for (const id of order) lateTime.set(id, projectEnd);
  for (const id of [...order].reverse()) {
    const t = lateTime.get(id) ?? projectEnd;
    for (const a of validActs.filter(a => a.toMilestoneId === id)) {
      const cur = lateTime.get(a.fromMilestoneId) ?? projectEnd;
      lateTime.set(a.fromMilestoneId, Math.min(cur, t - a.duration));
    }
  }

  return activities.map(a => {
    if (!milestoneIds.has(a.fromMilestoneId) || !milestoneIds.has(a.toMilestoneId)) return a;
    const es = earlyTime.get(a.fromMilestoneId) ?? 0;
    const ef = es + a.duration;
    const lf = lateTime.get(a.toMilestoneId) ?? 0;
    const ls = lf - a.duration;
    const totalFloat = ls - es;
    return { ...a, earlyStart: es, earlyFinish: ef, lateStart: ls, lateFinish: lf, totalFloat, isCritical: totalFloat === 0 };
  });
}
