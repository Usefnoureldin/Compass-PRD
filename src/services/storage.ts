import { supabase } from '../lib/supabase';
import type {
  CompassData,
  Idea,
  Requirement,
  Bug,
  Ticket,
  Sprint,
  User,
  Organization,
  Notification as AppNotification,
  StandupReport,
  Feature,
  FeatureAttachment,
} from '../types';

const EMPTY: CompassData = {
  ideas: [],
  requirements: [],
  tickets: [],
  sprints: [],
  shippedTickets: [],
  users: [],
  organizations: [],
  standupHistory: [],
  notifications: [],
  bugs: [],
  features: [],
  featureAttachments: [],
};

export const PRD_BUCKET = 'compass-prds';

// ---------- Helpers ----------
const ts = (n: number | undefined): string | undefined =>
  n === undefined ? undefined : new Date(n).toISOString();

const msFrom = (iso: string | null | undefined): number =>
  iso ? new Date(iso).getTime() : 0;

// Strip undefined keys before sending to Supabase (avoids overwriting columns with null).
const compact = <T extends Record<string, unknown>>(o: T): T => {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) if (v !== undefined) out[k] = v;
  return out as T;
};

// ---------- Mappers: row → domain ----------
const rowToIdea = (r: any): Idea => ({
  id: r.id,
  title: r.title,
  description: r.description,
  businessValue: r.business_value ?? '',
  sourceType: r.source_type,
  category: r.category,
  priority: r.priority,
  status: r.status,
  approverNotes: r.approver_notes ?? undefined,
  reportedBy: r.reported_by ?? undefined,
  affectedOrganizations: r.affected_organizations ?? [],
  order: r.order_index,
  createdAt: msFrom(r.created_at),
  updatedAt: msFrom(r.updated_at),
});

const rowToRequirement = (r: any): Requirement => ({
  id: r.id,
  title: r.title,
  description: r.description,
  clientName: r.client_name,
  category: r.category,
  priority: r.priority,
  status: r.status,
  reportedBy: r.reported_by ?? undefined,
  affectedOrganizations: r.affected_organizations ?? [],
  order: r.order_index,
  createdAt: msFrom(r.created_at),
  updatedAt: msFrom(r.updated_at),
});

const rowToBug = (r: any): Bug => ({
  id: r.id,
  title: r.title,
  description: r.description,
  severity: r.severity,
  priority: r.priority,
  status: r.status,
  platform: r.platform,
  layer: r.layer ?? undefined,
  stepsToReproduce: r.steps_to_reproduce ?? undefined,
  expectedResult: r.expected_result ?? undefined,
  actualResult: r.actual_result ?? undefined,
  screenshots: r.screenshots ?? [],
  reportedBy: r.reported_by,
  assignee: r.assignee ?? undefined,
  order: r.order_index,
  createdAt: msFrom(r.created_at),
  updatedAt: msFrom(r.updated_at),
});

const rowToTicket = (r: any): Ticket => ({
  id: r.id,
  title: r.title,
  description: r.description,
  status: r.status,
  priority: r.priority,
  category: r.category ?? undefined,
  categoryNumber: r.category_number ?? undefined,
  assignee: r.assignee ?? undefined,
  sprintId: r.sprint_id ?? undefined,
  relatedIdeaId: r.related_idea_id ?? undefined,
  tags: r.tags ?? [],
  effort: r.effort ?? undefined,
  comments: [],
  order: r.order_index,
  createdAt: msFrom(r.created_at),
  updatedAt: msFrom(r.updated_at),
});

const rowToSprint = (r: any): Sprint => ({
  id: r.id,
  name: r.name,
  status: r.status,
  startDate: msFrom(r.start_date),
  endDate: msFrom(r.end_date),
  createdAt: msFrom(r.created_at),
});

const rowToUser = (r: any): User => ({
  id: r.id,
  name: r.name,
  email: r.email,
  avatar: r.avatar ?? undefined,
  role: r.role,
  status: r.status,
  isBlocked: r.is_blocked,
  blockerReason: r.blocker_reason ?? undefined,
  currentTaskId: r.current_task_id ?? undefined,
  currentTaskStartedAt: r.current_task_started_at
    ? msFrom(r.current_task_started_at)
    : undefined,
});

const rowToOrganization = (r: any): Organization => ({
  id: r.id,
  name: r.name,
  logo: r.logo ?? undefined,
  isActive: r.is_active,
  features: r.features,
  createdAt: msFrom(r.created_at),
});

const rowToNotification = (r: any): AppNotification => ({
  id: r.id,
  userId: r.user_id,
  title: r.title,
  message: r.message,
  type: r.type,
  isRead: r.is_read,
  link: r.link ?? undefined,
  timestamp: msFrom(r.created_at),
});

const rowToFeature = (r: any): Feature => ({
  id: r.id,
  title: r.title,
  description: r.description ?? '',
  status: r.status,
  ownerId: r.owner_id ?? undefined,
  orgId: r.org_id ?? undefined,
  sprintId: r.sprint_id ?? undefined,
  prdMarkdown: r.prd_markdown ?? '',
  prdChecklistState: Array.isArray(r.prd_checklist_state) ? r.prd_checklist_state : [],
  order: r.order_index,
  createdAt: msFrom(r.created_at),
  updatedAt: msFrom(r.updated_at),
  parentExternalId: r.parent_external_id ?? undefined,
});

const rowToFeatureAttachment = (r: any): FeatureAttachment => ({
  id: r.id,
  featureId: r.feature_id,
  fileName: r.file_name,
  filePath: r.file_path,
  fileType: r.file_type,
  fileSize: r.file_size ?? 0,
  uploadedAt: msFrom(r.uploaded_at),
});

const rowToStandup = (r: any): StandupReport => ({
  id: r.id,
  date: msFrom(r.date),
  durationSeconds: r.duration_seconds,
  attendees: r.attendees ?? [],
  summary: r.summary ?? undefined,
});

// ---------- Mappers: domain → row ----------
const ideaToRow = (i: Idea) =>
  compact({
    id: i.id,
    title: i.title,
    description: i.description,
    business_value: i.businessValue,
    source_type: i.sourceType,
    category: i.category,
    priority: i.priority,
    status: i.status,
    approver_notes: i.approverNotes,
    reported_by: i.reportedBy,
    affected_organizations: i.affectedOrganizations ?? [],
    order_index: i.order,
    created_at: ts(i.createdAt),
    updated_at: ts(i.updatedAt),
  });

const requirementToRow = (r: Requirement) =>
  compact({
    id: r.id,
    title: r.title,
    description: r.description,
    client_name: r.clientName,
    category: r.category,
    priority: r.priority,
    status: r.status,
    reported_by: r.reportedBy,
    affected_organizations: r.affectedOrganizations ?? [],
    order_index: r.order,
    created_at: ts(r.createdAt),
    updated_at: ts(r.updatedAt),
  });

const bugToRow = (b: Bug) =>
  compact({
    id: b.id,
    title: b.title,
    description: b.description,
    severity: b.severity,
    priority: b.priority,
    status: b.status,
    platform: b.platform,
    layer: b.layer,
    steps_to_reproduce: b.stepsToReproduce,
    expected_result: b.expectedResult,
    actual_result: b.actualResult,
    screenshots: b.screenshots ?? [],
    reported_by: b.reportedBy,
    assignee: b.assignee,
    order_index: b.order,
    created_at: ts(b.createdAt),
    updated_at: ts(b.updatedAt),
  });

const ticketToRow = (t: Ticket) =>
  compact({
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    category: t.category,
    category_number: t.categoryNumber,
    assignee: t.assignee,
    sprint_id: t.sprintId,
    related_idea_id: t.relatedIdeaId,
    tags: t.tags ?? [],
    effort: t.effort,
    order_index: t.order,
    created_at: ts(t.createdAt),
    updated_at: ts(t.updatedAt),
  });

const sprintToRow = (s: Sprint) =>
  compact({
    id: s.id,
    name: s.name,
    status: s.status,
    start_date: ts(s.startDate),
    end_date: ts(s.endDate),
    created_at: ts(s.createdAt),
  });

const userToRow = (u: User) =>
  compact({
    id: u.id,
    name: u.name,
    email: u.email,
    avatar: u.avatar,
    role: u.role,
    status: u.status,
    is_blocked: u.isBlocked ?? false,
    blocker_reason: u.blockerReason,
    current_task_id: u.currentTaskId,
    current_task_started_at: ts(u.currentTaskStartedAt),
  });

const organizationToRow = (o: Organization) =>
  compact({
    id: o.id,
    name: o.name,
    logo: o.logo,
    is_active: o.isActive,
    features: o.features,
    created_at: ts(o.createdAt),
  });

const notificationToRow = (n: AppNotification) =>
  compact({
    id: n.id,
    user_id: n.userId,
    title: n.title,
    message: n.message,
    type: n.type,
    is_read: n.isRead,
    link: n.link,
    created_at: ts(n.timestamp),
  });

const featureToRow = (f: Feature) =>
  compact({
    id: f.id,
    title: f.title,
    description: f.description,
    status: f.status,
    owner_id: f.ownerId,
    org_id: f.orgId,
    sprint_id: f.sprintId,
    prd_markdown: f.prdMarkdown,
    prd_checklist_state: f.prdChecklistState ?? [],
    order_index: f.order,
    created_at: ts(f.createdAt),
    updated_at: ts(f.updatedAt),
    parent_external_id: f.parentExternalId,
  });

const featureAttachmentToRow = (a: FeatureAttachment) =>
  compact({
    id: a.id,
    feature_id: a.featureId,
    file_name: a.fileName,
    file_path: a.filePath,
    file_type: a.fileType,
    file_size: a.fileSize,
    uploaded_at: ts(a.uploadedAt),
  });

const standupToRow = (s: StandupReport) =>
  compact({
    id: s.id,
    date: ts(s.date),
    duration_seconds: s.durationSeconds,
    attendees: s.attendees,
    summary: s.summary,
  });

// ---------- Sync helpers ----------
/**
 * Mirror a local array into a Supabase table:
 * upsert all current items, then delete any rows whose IDs aren't in the local set.
 * Three round trips per table (upsert + select existing + delete), all parallelizable
 * across tables via Promise.all in saveAll().
 */
async function syncTable<T extends { id: string }>(
  table: string,
  items: T[],
  toRow: (item: T) => Record<string, unknown>
): Promise<void> {
  if (items.length > 0) {
    const { error } = await supabase
      .from(table)
      .upsert(items.map(toRow), { onConflict: 'id' });
    if (error) throw new Error(`upsert ${table}: ${error.message}`);
  }

  const { data: existing, error: selErr } = await supabase.from(table).select('id');
  if (selErr) throw new Error(`select ${table}: ${selErr.message}`);

  const keep = new Set(items.map((i) => i.id));
  const toDelete = (existing ?? [])
    .map((r: { id: string }) => r.id)
    .filter((id) => !keep.has(id));

  if (toDelete.length > 0) {
    const { error: delErr } = await supabase.from(table).delete().in('id', toDelete);
    if (delErr) throw new Error(`delete ${table}: ${delErr.message}`);
  }
}

// ---------- Public API ----------
export const storage = {
  async fetchAll(): Promise<CompassData> {
    const [
      orgs,
      users,
      ideas,
      reqs,
      bugs,
      tickets,
      sprints,
      notifs,
      standups,
      features,
      featureAttachments,
    ] = await Promise.all([
      supabase.from('organizations').select('*'),
      supabase.from('users').select('*'),
      supabase.from('ideas').select('*').order('order_index', { ascending: true }),
      supabase.from('requirements').select('*').order('order_index', { ascending: true }),
      supabase.from('bugs').select('*').order('order_index', { ascending: true }),
      supabase.from('tickets').select('*').order('order_index', { ascending: true }),
      supabase.from('sprints').select('*'),
      supabase.from('notifications').select('*').order('created_at', { ascending: false }),
      supabase.from('standup_reports').select('*').order('date', { ascending: false }),
      supabase.from('features').select('*').order('order_index', { ascending: true }),
      supabase.from('feature_attachments').select('*').order('uploaded_at', { ascending: false }),
    ]);

    const firstError =
      orgs.error ||
      users.error ||
      ideas.error ||
      reqs.error ||
      bugs.error ||
      tickets.error ||
      sprints.error ||
      notifs.error ||
      standups.error ||
      features.error ||
      featureAttachments.error;

    if (firstError) {
      console.error('[storage.fetchAll] Supabase error:', firstError);
      return EMPTY;
    }

    return {
      organizations: (orgs.data ?? []).map(rowToOrganization),
      users: (users.data ?? []).map(rowToUser),
      ideas: (ideas.data ?? []).map(rowToIdea),
      requirements: (reqs.data ?? []).map(rowToRequirement),
      bugs: (bugs.data ?? []).map(rowToBug),
      tickets: (tickets.data ?? []).map(rowToTicket),
      sprints: (sprints.data ?? []).map(rowToSprint),
      notifications: (notifs.data ?? []).map(rowToNotification),
      standupHistory: (standups.data ?? []).map(rowToStandup),
      features: (features.data ?? []).map(rowToFeature),
      featureAttachments: (featureAttachments.data ?? []).map(rowToFeatureAttachment),
      shippedTickets: [],
    };
  },

  async saveAll(data: CompassData): Promise<void> {
    // Save in two phases so referenced rows (users, sprints, ideas, organizations)
    // exist before anything FK-references them.
    await Promise.all([
      syncTable('organizations', data.organizations, organizationToRow),
      syncTable('users', data.users, userToRow),
      syncTable('sprints', data.sprints, sprintToRow),
      syncTable('ideas', data.ideas, ideaToRow),
    ]);

    await Promise.all([
      syncTable('requirements', data.requirements, requirementToRow),
      syncTable('bugs', data.bugs, bugToRow),
      syncTable('tickets', data.tickets, ticketToRow),
      syncTable('notifications', data.notifications, notificationToRow),
      syncTable('standup_reports', data.standupHistory, standupToRow),
      syncTable('features', data.features, featureToRow),
    ]);

    // Attachments depend on features; sync after.
    await syncTable('feature_attachments', data.featureAttachments, featureAttachmentToRow);
  },

  // ---------- File uploads ----------
  async uploadAttachment(
    featureId: string,
    file: File
  ): Promise<{ filePath: string; fileType: 'md' | 'pdf'; fileSize: number; fileName: string }> {
    const lower = file.name.toLowerCase();
    const isMd = lower.endsWith('.md') || file.type === 'text/markdown';
    const isPdf = lower.endsWith('.pdf') || file.type === 'application/pdf';
    if (!isMd && !isPdf) {
      throw new Error(`Unsupported file type. Upload .md or .pdf only.`);
    }
    const fileType: 'md' | 'pdf' = isPdf ? 'pdf' : 'md';

    // Sanitize filename for storage path.
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `${featureId}/${Date.now()}-${safeName}`;

    const { error } = await supabase.storage
      .from(PRD_BUCKET)
      .upload(filePath, file, {
        contentType: isPdf ? 'application/pdf' : 'text/markdown',
        upsert: false,
      });
    if (error) throw new Error(`upload attachment: ${error.message}`);

    return { filePath, fileType, fileSize: file.size, fileName: file.name };
  },

  async deleteAttachmentFile(filePath: string): Promise<void> {
    const { error } = await supabase.storage.from(PRD_BUCKET).remove([filePath]);
    if (error) throw new Error(`delete attachment: ${error.message}`);
  },

  getAttachmentUrl(filePath: string): string {
    return supabase.storage.from(PRD_BUCKET).getPublicUrl(filePath).data.publicUrl;
  },

  async downloadAttachmentText(filePath: string): Promise<string> {
    const { data, error } = await supabase.storage.from(PRD_BUCKET).download(filePath);
    if (error) throw new Error(`download attachment: ${error.message}`);
    return await data.text();
  },

  // Kept for legacy callers; both now resolve to the async path.
  getData: (): CompassData => EMPTY,
  saveData: (_data: CompassData): void => {
    /* no-op: use saveAll instead */
  },
};
