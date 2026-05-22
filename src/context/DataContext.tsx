import React, { createContext, useContext, useEffect, useState } from 'react';
import { CompassData, Idea, Ticket, User, Requirement, Organization, ActivityEvent, StandupReport, Notification as AppNotification, Sprint, Bug } from '../types';
import { storage } from '../services/storage';
import { v4 as uuidv4 } from 'uuid';


interface DataContextType {
  data: CompassData;
  activityLog: ActivityEvent[];
  isLoading: boolean;
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
    notifications: []
  });
  const [activityLog, setActivityLog] = useState<ActivityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
        notifications: stored.notifications || []
      });
      setIsLoading(false);
    };
    loadData();
  }, []);

  // Persist on change
  useEffect(() => {
    if (!isLoading) {
      storage.saveAll(data);
    }
  }, [data, isLoading]);

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
    }
  };

  return (
    <DataContext.Provider value={{ data, isLoading, activityLog, actions }}>
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
