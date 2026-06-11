export interface Milestone {
  id: string;
  name: string;
  description: string;
  x: number;
  y: number;
}

export interface Activity {
  id: string;
  name: string;
  description: string;
  fromMilestoneId: string;
  toMilestoneId: string;
  pathId: string;
  duration: number;
  isOngoing?: boolean;
  earlyStart?: number;
  earlyFinish?: number;
  lateStart?: number;
  lateFinish?: number;
  totalFloat?: number;
  isCritical?: boolean;
}

export interface Path {
  id: string;
  name: string;
  description: string;
  color: string;
}

export interface Diagram {
  title: string;
  milestones: Milestone[];
  activities: Activity[];
  paths: Path[];
  startMilestoneId?: string | null;
  endMilestoneId?: string | null;
}

export type SelectionType = 'milestone' | 'activity' | 'path' | null;

export interface Selection {
  type: SelectionType;
  id: string | null;
}

export interface ConsistencyIssue {
  type: 'error' | 'warning';
  message: string;
  relatedId?: string;
}
