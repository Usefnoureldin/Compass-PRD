import React, { createContext, useContext, useEffect, useState } from 'react';
import { CompassData, Idea, Ticket, User, Requirement, Organization, ActivityEvent, StandupReport, Notification as AppNotification, Sprint, Bug, Feature, FeatureAttachment } from '../types';
import { storage } from '../services/storage';
import { toggleChecklistKey } from '@/lib/checklist';
import { v4 as uuidv4 } from 'uuid';


export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface DataContextType {
  data: CompassData;
  activityLog: ActivityEvent[];
  isLoading: boolean;
  saveStatus: SaveStatus;
  saveError: string | null;
  retrySave: () => void;
  actions: {
    addIdea: (idea: Omit<Idea, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'order'>) => void;
    updateIdea: (id: string, updates: Partial<Idea>) => void;
    deleteIdea: (id: string) => void;
    markIdeaPromoted: (ideaId: string) => void;
    reorderIdeas: (startIndex: number, endIndex: number) => void;
    
    // Requirements
    addRequirement: (req: Omit<Requirement, 'id' | 'createdAt' | 'status' | 'updatedAt' | 'order'>) => void;
    updateRequirement: (id: string, updates: Partial<Requirement>) => void;
    deleteRequirement: (id: string) => void;
    markRequirementPromoted: (reqId: string) => void;
    reorderRequirements: (startIndex: number, endIndex: number) => void;

    addUser: (user: Omit<User, 'id'>) => void;
    updateUser: (id: string, updates: Partial<User>) => void;
    deleteUser: (id: string) => void;
    
    // Organizations
    addOrganization: (org: Omit<Organization, 'id' | 'createdAt'>) => void;
    updateOrganization: (id: string, updates: Partial<Organization>) => void;
    bulkUpdateOrganizations: (ids: string[], updates: any) => void;
    deleteOrganization: (id: string) => void;

    // Bugs
    addBug: (bug: Omit<Bug, 'id' | 'createdAt' | 'updatedAt' | 'comments' | 'order'>) => void;
    reorderBugs: (startIndex: number, endIndex: number) => void;
    updateBug: (id: string, updates: Partial<Bug>) => void;
    deleteBug: (id: string) => void;
    markBugPromoted: (bugId: string) => void;

    // Legacy stubs for components not yet migrated to Linear
    addTicket: (ticket: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt' | 'comments' | 'order'>) => void;
    updateTicket: (id: string, updates: Partial<Ticket>) => void;
    moveTicket: (id: string, newStatus: Ticket['status']) => void;
    deleteTicket: (id: string) => void;
    archiveTicket: (id: string) => void;
    reorderTickets: (assignee: string | undefined, status: Ticket['status'], startIndex: number, endIndex: number) => void;
    moveTicketInUserList: (userId: string, startIndex: number, endIndex: number) => void;
    addSprint: (sprint: Omit<Sprint, 'id' | 'createdAt'>) => void;
    updateSprint: (id: string, updates: Partial<Sprint>) => void;
    deleteSprint: (id: string) => void;
    startSprint: (id: string, startDate: number, endDate: number) => void;
    completeSprint: (id: string) => void;
    assignTicket: (ticketId: string, userId: string) => void;
    unassignTicket: (ticketId: string, userId: string) => void;
    completeTicket: (ticketId: string, userId: string) => void;

    // EngineRoom Actions
    updateUserStatus: (userId: string, status: User['status']) => void;
    toggleUserBlocker: (userId: string, isBlocked: boolean, reason?: string) => void;
    saveStandupReport: (report: Omit<StandupReport, 'id'>) => void;
    
    // Notifications
    addNotification: (notification: Omit<AppNotification, 'id' | 'timestamp' | 'isRead'>) => void;
    markNotificationAsRead: (id: string) => void;
    markAllNotificationsAsRead: () => void;

    // Features
    addFeature: (feature: Omit<Feature, 'id' | 'createdAt' | 'updatedAt' | 'order' | 'prdChecklistState'>) => string;
    updateFeature: (id: string, updates: Partial<Feature>) => void;
    deleteFeature: (id: string) => void;
    reorderFeatures: (status: Feature['status'], startIndex: number, endIndex: number) => void;
    moveFeature: (featureId: string, toStatus: Feature['status'], toIndex: number) => void;
    toggleChecklistItem: (featureId: string, key: string) => void;
    uploadFeatureAttachment: (featureId: string, file: File, options?: { setAsPrd?: boolean }) => Promise<FeatureAttachment>;
    deleteFeatureAttachment: (attachmentId: string) => Promise<void>;
  };
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<CompassData>({
    ideas: [],
    requirements: [],
    bugs: [],
    tickets: [],
    sprints: [],
    shippedTickets: [],
    users: [],
    organizations: [],
    standupHistory: [],
    notifications: [],
    features: [],
    featureAttachments: []
  });
  const [activityLog, setActivityLog] = useState<ActivityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const savedTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const stored = await storage.fetchAll();
      setData({
        ideas: stored.ideas || [],
        requirements: stored.requirements || [],
        bugs: stored.bugs || [],
        tickets: stored.tickets || [],
        sprints: stored.sprints || [],
        shippedTickets: stored.shippedTickets || [],
        users: stored.users || [],
        organizations: stored.organizations || [],
        standupHistory: stored.standupHistory || [],
        notifications: stored.notifications || [],
        features: stored.features || [],
        featureAttachments: stored.featureAttachments || []
      });
      setIsLoading(false);
    };
    loadData();
  }, []);

  // Persist on change — every state change writes straight to Supabase.
  // Errors surface via saveStatus so they're never silent.
  const persist = React.useCallback(async (snapshot: CompassData) => {
    setSaveStatus('saving');
    setSaveError(null);
    try {
      await storage.saveAll(snapshot);
      setSaveStatus('saved');
      if (savedTimer.current) clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaveStatus('idle'), 1500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[DataContext.saveAll] failed:', err);
      setSaveError(msg);
      setSaveStatus('error');
    }
  }, []);

  useEffect(() => {
    if (!isLoading) persist(data);
  }, [data, isLoading, persist]);

  const retrySave = React.useCallback(() => {
    persist(data);
  }, [data, persist]);

  const saveData = (newData: CompassData) => {
    setData(newData);
  };

  const actions = {
    addIdea: (newIdea: Omit<Idea, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'order'>) => {
      const idea: Idea = {
        ...newIdea,
        id: uuidv4(),
        status: 'pending',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        order: data.ideas.length,
      };
      saveData({ ...data, ideas: [idea, ...data.ideas] });
    },

    updateIdea: (id: string, updates: Partial<Idea>) => {
      const updatedIdeas = data.ideas.map(idea =>
        idea.id === id ? { ...idea, ...updates, updatedAt: Date.now() } : idea
      );
      saveData({ ...data, ideas: updatedIdeas });
    },

    deleteIdea: (id: string) => {
      saveData({ ...data, ideas: data.ideas.filter(idea => idea.id !== id) });
    },

    markIdeaPromoted: (ideaId: string) => {
      const updatedIdeas = data.ideas.map(i =>
        i.id === ideaId ? { ...i, status: 'approved' as const, updatedAt: Date.now() } : i
      );
      saveData({ ...data, ideas: updatedIdeas });
    },

    reorderIdeas: (startIndex: number, endIndex: number) => {
      const result = Array.from(data.ideas);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      const updatedIdeas = result.map((item, index) => ({ ...item, order: index }));
      saveData({ ...data, ideas: updatedIdeas });
    },

    // Notifications
    addNotification: (notification: Omit<AppNotification, 'id' | 'timestamp' | 'isRead'>) => {
        const newNotification: AppNotification = {
            ...notification,
            id: uuidv4(),
            timestamp: Date.now(),
            isRead: false
        };
        saveData({ ...data, notifications: [newNotification, ...data.notifications] });
    },

    markNotificationAsRead: (id: string) => {
        saveData({
            ...data,
            notifications: data.notifications.map(n => n.id === id ? { ...n, isRead: true } : n)
        });
    },

    markAllNotificationsAsRead: () => {
        saveData({
            ...data,
            notifications: data.notifications.map(n => ({ ...n, isRead: true }))
        });
    },

    // Requirements
    addRequirement: (req: Omit<Requirement, 'id' | 'createdAt' | 'status' | 'updatedAt' | 'order'>) => {
        const requirement: Requirement = {
            ...req,
            id: uuidv4(),
            status: 'pending',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            order: data.requirements.length,
        };
        saveData({ ...data, requirements: [requirement, ...data.requirements] });
    },

    updateRequirement: (id: string, updates: Partial<Requirement>) => {
        const updatedReqs = data.requirements.map(req =>
            req.id === id ? { ...req, ...updates, updatedAt: Date.now() } : req
        );
        saveData({ ...data, requirements: updatedReqs });
    },

    deleteRequirement: (id: string) => {
        saveData({ ...data, requirements: data.requirements.filter(r => r.id !== id) });
    },

    markRequirementPromoted: (reqId: string) => {
        const updatedReqs = data.requirements.map(r => 
            r.id === reqId ? { ...r, status: 'approved' as const, updatedAt: Date.now() } : r
        );
        saveData({ ...data, requirements: updatedReqs });
    },

    reorderRequirements: (startIndex: number, endIndex: number) => {
        const result = Array.from(data.requirements);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);
        const updatedReqs = result.map((item, index) => ({ ...item, order: index }));
        saveData({ ...data, requirements: updatedReqs });
    },

    addUser: (user: Omit<User, 'id'>) => {
        const newUser: User = { ...user, id: uuidv4() };
        saveData({ ...data, users: [...data.users, newUser] });
    },

    updateUser: (id: string, updates: Partial<User>) => {
        saveData({ 
            ...data, 
            users: data.users.map(u => u.id === id ? { ...u, ...updates } : u) 
        });
    },

    deleteUser: (id: string) => {
        saveData({ ...data, users: data.users.filter(u => u.id !== id) });
    },

    // Organizations
    addOrganization: (org: Omit<Organization, 'id' | 'createdAt'>) => {
        const newOrg: Organization = { ...org, id: uuidv4(), createdAt: Date.now() };
        saveData({ ...data, organizations: [newOrg, ...data.organizations] });
    },

    updateOrganization: (id: string, updates: Partial<Organization>) => {
        saveData({
            ...data,
            organizations: data.organizations.map(d => d.id === id ? { ...d, ...updates } : d)
        });
    },

    bulkUpdateOrganizations: (ids: string[], updates: any) => {
        saveData({
            ...data,
            organizations: data.organizations.map(d => {
                if (ids.includes(d.id)) {
                    const newFeatures = updates.features 
                        ? { ...d.features, ...updates.features } 
                        : d.features;
                    return { ...d, ...updates, features: newFeatures };
                }
                return d;
            })
        });
    },

    deleteOrganization: (id: string) => {
        saveData({ ...data, organizations: data.organizations.filter(d => d.id !== id) });
    },

    // Bugs
    addBug: (bug: Omit<Bug, 'id' | 'createdAt' | 'updatedAt' | 'comments' | 'order'>) => {
        const newBug: Bug = {
            ...bug,
            id: uuidv4(),
            createdAt: Date.now(),
            updatedAt: Date.now(),
            comments: [],
            order: data.bugs.length
        };
        saveData({ ...data, bugs: [newBug, ...data.bugs] });
    },

    reorderBugs: (startIndex: number, endIndex: number) => {
        const result = Array.from(data.bugs);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);
        const updatedBugs = result.map((bug, index) => ({ ...bug, order: index }));
        saveData({ ...data, bugs: updatedBugs });
    },

    updateBug: (id: string, updates: Partial<Bug>) => {
        saveData({
            ...data,
            bugs: data.bugs.map(b => b.id === id ? { ...b, ...updates, updatedAt: Date.now() } : b)
        });
    },

    deleteBug: (id: string) => {
        saveData({ ...data, bugs: data.bugs.filter(b => b.id !== id) });
    },

    markBugPromoted: (bugId: string) => {
        const updatedBugs = data.bugs.map(b => 
            b.id === bugId ? { ...b, status: 'in_progress' as const, updatedAt: Date.now() } : b
        );
        saveData({ ...data, bugs: updatedBugs });
    },

    // Legacy stubs - these exist for backward compatibility with components not yet migrated
    addTicket: () => { console.warn('addTicket: Use Linear integration instead'); },
    updateTicket: (id: string, updates: Partial<Ticket>) => {
      const updatedTickets = data.tickets.map(t => t.id === id ? { ...t, ...updates, updatedAt: Date.now() } : t);
      saveData({ ...data, tickets: updatedTickets });
    },
    moveTicket: (id: string, newStatus: Ticket['status']) => {
      const updatedTickets = data.tickets.map(t => t.id === id ? { ...t, status: newStatus, updatedAt: Date.now() } : t);
      saveData({ ...data, tickets: updatedTickets });
    },
    deleteTicket: (id: string) => { saveData({ ...data, tickets: data.tickets.filter(t => t.id !== id) }); },
    archiveTicket: () => {},
    reorderTickets: () => {},
    moveTicketInUserList: () => {},
    addSprint: () => {},
    updateSprint: () => {},
    deleteSprint: () => {},
    startSprint: () => {},
    completeSprint: () => {},
    assignTicket: () => {},
    unassignTicket: () => {},
    completeTicket: () => {},

    // EngineRoom Actions
    updateUserStatus: (userId: string, status: User['status']) => {
        const user = data.users.find(u => u.id === userId);
        if (user && user.status !== status) {
            const updatedUsers = data.users.map(u => u.id === userId ? { ...u, status } : u);
            saveData({ ...data, users: updatedUsers });
            const event: ActivityEvent = {
                id: uuidv4(),
                userId,
                type: 'status_change',
                timestamp: Date.now(),
                details: `changed status to ${status}`
            };
            setActivityLog(prev => [event, ...prev]);
        }
    },

    toggleUserBlocker: (userId: string, isBlocked: boolean, reason?: string) => {
        const updatedUsers = data.users.map(u => u.id === userId ? { ...u, isBlocked, blockerReason: isBlocked ? reason : undefined } : u);
        saveData({ ...data, users: updatedUsers });
        const event: ActivityEvent = {
            id: uuidv4(),
            userId,
            type: 'blocker',
            timestamp: Date.now(),
            details: isBlocked ? `is blocked: ${reason || 'No reason provided'}` : 'cleared blocker'
        };
        setActivityLog(prev => [event, ...prev]);
    },

    saveStandupReport: (report: Omit<StandupReport, 'id'>) => {
        const newReport: StandupReport = { ...report, id: uuidv4() };
        saveData({ ...data, standupHistory: [newReport, ...data.standupHistory] });
    },

    // Features
    addFeature: (feature: Omit<Feature, 'id' | 'createdAt' | 'updatedAt' | 'order' | 'prdChecklistState'>): string => {
        const id = uuidv4();
        const newFeature: Feature = {
            ...feature,
            id,
            prdChecklistState: [],
            order: data.features.length,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        saveData({ ...data, features: [newFeature, ...data.features] });
        return id;
    },

    toggleChecklistItem: (featureId: string, key: string) => {
        const feature = data.features.find(f => f.id === featureId);
        if (!feature) return;
        const nextState = toggleChecklistKey(feature, key);
        const updated = data.features.map(f =>
            f.id === featureId
                ? { ...f, prdChecklistState: nextState, updatedAt: Date.now() }
                : f
        );
        saveData({ ...data, features: updated });
    },

    updateFeature: (id: string, updates: Partial<Feature>) => {
        const updated = data.features.map(f =>
            f.id === id ? { ...f, ...updates, updatedAt: Date.now() } : f
        );
        saveData({ ...data, features: updated });
    },

    deleteFeature: (id: string) => {
        // Drop attachment rows for this feature; storage files are cleaned up best-effort.
        const orphanFiles = data.featureAttachments
            .filter(a => a.featureId === id)
            .map(a => a.filePath);
        if (orphanFiles.length > 0) {
            storage.deleteAttachmentFile(orphanFiles[0]).catch(() => {});
            // Fire-and-forget cleanup for the rest.
            orphanFiles.slice(1).forEach(p => {
                storage.deleteAttachmentFile(p).catch(() => {});
            });
        }
        saveData({
            ...data,
            features: data.features.filter(f => f.id !== id),
            featureAttachments: data.featureAttachments.filter(a => a.featureId !== id),
        });
    },

    reorderFeatures: (status: Feature['status'], startIndex: number, endIndex: number) => {
        const inStatus = data.features.filter(f => f.status === status).sort((a, b) => a.order - b.order);
        const others = data.features.filter(f => f.status !== status);
        const [removed] = inStatus.splice(startIndex, 1);
        inStatus.splice(endIndex, 0, removed);
        const reindexed = inStatus.map((f, i) => ({ ...f, order: i }));
        saveData({ ...data, features: [...others, ...reindexed] });
    },

    moveFeature: (featureId: string, toStatus: Feature['status'], toIndex: number) => {
        const feature = data.features.find(f => f.id === featureId);
        if (!feature) return;
        const fromStatus = feature.status;

        if (fromStatus === toStatus) {
            const inCol = data.features.filter(f => f.status === toStatus).sort((a, b) => a.order - b.order);
            const fromIndex = inCol.findIndex(f => f.id === featureId);
            if (fromIndex === -1 || fromIndex === toIndex) return;
            const [removed] = inCol.splice(fromIndex, 1);
            inCol.splice(toIndex, 0, removed);
            const reindexed = inCol.map((f, i) => ({ ...f, order: i }));
            const others = data.features.filter(f => f.status !== toStatus);
            saveData({ ...data, features: [...others, ...reindexed] });
            return;
        }

        // Cross-column: change status and reindex both columns.
        const destCol = data.features
            .filter(f => f.status === toStatus)
            .sort((a, b) => a.order - b.order);
        const movedFeature: Feature = { ...feature, status: toStatus, updatedAt: Date.now() };
        destCol.splice(toIndex, 0, movedFeature);
        const destReindexed = destCol.map((f, i) => ({ ...f, order: i }));

        const srcReindexed = data.features
            .filter(f => f.status === fromStatus && f.id !== featureId)
            .sort((a, b) => a.order - b.order)
            .map((f, i) => ({ ...f, order: i }));

        const others = data.features.filter(f => f.status !== fromStatus && f.status !== toStatus);
        saveData({ ...data, features: [...others, ...srcReindexed, ...destReindexed] });
    },

    uploadFeatureAttachment: async (
        featureId: string,
        file: File,
        options?: { setAsPrd?: boolean }
    ): Promise<FeatureAttachment> => {
        const { filePath, fileType, fileSize, fileName } = await storage.uploadAttachment(featureId, file);
        const attachment: FeatureAttachment = {
            id: uuidv4(),
            featureId,
            fileName,
            filePath,
            fileType,
            fileSize,
            uploadedAt: Date.now(),
        };

        // Optionally read .md content straight into the feature's PRD body.
        let prdUpdate: Partial<Feature> | null = null;
        if (options?.setAsPrd && fileType === 'md') {
            try {
                const text = await file.text();
                prdUpdate = { prdMarkdown: text, updatedAt: Date.now() };
            } catch {
                /* ignore — attachment still saved */
            }
        }

        setData(prev => ({
            ...prev,
            featureAttachments: [attachment, ...prev.featureAttachments],
            features: prdUpdate
                ? prev.features.map(f => (f.id === featureId ? { ...f, ...prdUpdate! } : f))
                : prev.features,
        }));

        return attachment;
    },

    deleteFeatureAttachment: async (attachmentId: string): Promise<void> => {
        const attachment = data.featureAttachments.find(a => a.id === attachmentId);
        if (!attachment) return;
        try {
            await storage.deleteAttachmentFile(attachment.filePath);
        } catch (err) {
            console.warn('[deleteFeatureAttachment] storage cleanup failed:', err);
        }
        setData(prev => ({
            ...prev,
            featureAttachments: prev.featureAttachments.filter(a => a.id !== attachmentId),
        }));
    }
  };

  return (
    <DataContext.Provider value={{ data, isLoading, activityLog, saveStatus, saveError, retrySave, actions }}>
      {children}
    </DataContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within DataProvider');
  return context;
};
