export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type IdeaStatus = 'pending' | 'approved' | 'rejected' | 'needs_clarification';
export type TicketStatus = 'backlog' | 'in_sprint' | 'todo' | 'in_progress' | 'in_review' | 'blocked' | 'ready_for_qa' | 'done' | 'shipped';
export type TicketType = 'feature' | 'improvement' | 'bug';
export type SourceType = 'client' | 'internal';

export interface Comment {
  id: string;
  text: string;
  author: string; // "User" for now
  createdAt: number;
}


export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'frontend' | 'backend' | 'fullstack' | 'manager';
  status: 'online' | 'break' | 'off';
  isBlocked?: boolean;
  blockerReason?: string;
  currentTaskId?: string;
  currentTaskStartedAt?: number;
}

export type ActivityType = 'status_change' | 'task_start' | 'task_done' | 'blocker';

export interface ActivityEvent {
  id: string;
  userId: string;
  type: ActivityType;
  timestamp: number;
  details: string;
  ticketId?: string;
}

export interface Idea {
  id: string;
  title: string;
  description: string;
  businessValue: string;
  sourceType: SourceType;
  category: TicketType;
  priority: Priority;
  status: IdeaStatus;
  approverNotes?: string;
  createdAt: number;
  updatedAt: number;
  reportedBy?: string;
  affectedOrganizations?: string[];
  comments?: Comment[];
  order: number; // For drag and drop ordering
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: Priority;
  category?: TicketType;
  categoryNumber?: number;
  assignee?: string;
  sprintId?: string;
  relatedIdeaId?: string;
  tags?: string[];
  effort?: number;
  comments: Comment[];
  createdAt: number;
  updatedAt: number;
  order: number;
}

export interface Sprint {
  id: string;
  name: string;
  status: 'active' | 'completed' | 'planned';
  startDate: number;
  endDate: number;
  createdAt: number;
}


// --- BUG TRACKER TYPES ---

export type BugSeverity = 'blocker' | 'critical' | 'major' | 'minor' | 'cosmetic';
export type BugStatus = 'todo' | 'in_progress' | 'in_review' | 'ready_for_qa' | 'resolved' | 'blocked';
export type Platform = 'desktop' | 'mobile' | 'all';
export type BugLayer = 'frontend' | 'backend' | 'fullstack' | 'design' | 'database' | 'devops';

export interface Bug {
  id: string;
  title: string;
  description: string;
  severity: BugSeverity;
  priority: Priority; // Reusing existing Priority type
  status: BugStatus;
  platform: Platform;
  layer?: BugLayer;
  
  // Reproduction
  stepsToReproduce?: string;
  expectedResult?: string;
  actualResult?: string;
  screenshots?: string[];
  
  // Metadata
  reportedBy: string; // User ID or Name
  assignee?: string; // User ID
  createdAt: number;
  updatedAt: number;
  comments?: Comment[];
  order: number;
}

export type RequirementStatus = 'pending' | 'approved' | 'rejected';

export interface Requirement {
  id: string;
  title: string;
  description: string;
  clientName: string;
  category: TicketType;
  priority: Priority;
  status: RequirementStatus;
  createdAt: number;
  reportedBy?: string;
  affectedOrganizations?: string[];
  updatedAt?: number;
  comments?: Comment[];
  order: number; // For drag and drop ordering
}

export interface OrganizationFeatures {
  leads: boolean;
  reservations: boolean;
  eois: boolean;
  brokerages: boolean;
  ticketing: boolean;
  analytics: boolean;
}

export interface Organization {
  id: string;
  name: string;
  logo?: string;
  isActive: boolean;
  features: OrganizationFeatures;
  createdAt: number;
}

export type FeatureStatus = 'planned' | 'building' | 'shipped';

/** Persisted overlay — completion state by stable key. */
export interface ChecklistState {
  key: string;
  isDone: boolean;
  completedAt?: number;
}

/** Hydrated row used by the UI — parsed item + overlay state. */
export interface ChecklistItem {
  key: string;
  text: string;
  kind: 'heading' | 'checklist';
  headingLevel?: number;
  /** Nesting level for bullet items, 0 = top-level. */
  indent?: number;
  /** Optional task identifier (e.g. "0.A.1") parsed from a GFM table's first column. */
  identifier?: string;
  /** Optional trailing metadata (e.g. "0.5 days") parsed from a GFM table's last column. */
  meta?: string;
  order: number;
  isDone: boolean;
  completedAt?: number;
}

export interface FeatureAttachment {
  id: string;
  featureId: string;
  fileName: string;
  filePath: string; // storage path inside the `compass-prds` bucket
  fileType: 'md' | 'pdf';
  fileSize: number;
  uploadedAt: number;
}

export interface Feature {
  id: string;
  title: string;
  description: string;
  status: FeatureStatus;
  ownerId?: string;
  orgId?: string;
  sprintId?: string;
  prdMarkdown: string;
  prdChecklistState: ChecklistState[];
  order: number;
  createdAt: number;
  updatedAt: number;
  /** Stable external identifier — the upsert key used by the hostbase-product sync CLI. */
  externalId?: string;
  /** When set, this feature is a sub-feature of another headline; hidden from /features table. */
  parentExternalId?: string;
}

export interface CompassData {
  ideas: Idea[];
  requirements: Requirement[];
  bugs: Bug[]; // New
  tickets: Ticket[];
  sprints: Sprint[];
  users: User[];
  organizations: Organization[];
  features: Feature[];
  featureAttachments: FeatureAttachment[];
  shippedTickets: Ticket[]; // Archive
  standupHistory: StandupReport[];
  notifications: Notification[];
}

export interface Notification {
  id: string;
  userId: string; // Who receives it
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  timestamp: number;
  link?: string;
}

export interface StandupAttendeeSnapshot {
  userId: string;
  name: string;
  avatar?: string;
  role: string;
  status: string;
  isBlocked: boolean;
  blockerReason?: string;
  yesterdayTickets: { id: string; title: string; }[];
  todayTickets: { id: string; title: string; }[];
}

export interface StandupReport {
  id: string;
  date: number; // timestamp
  durationSeconds: number;
  attendees: StandupAttendeeSnapshot[];
  summary?: string; 
}
