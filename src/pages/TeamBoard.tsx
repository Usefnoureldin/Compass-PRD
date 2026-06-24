import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { DeveloperRow } from '../components/team/DeveloperRow';
import { ActivityFeed } from '../components/team/ActivityFeed';
import { AssignTicketDialog } from '../components/team/AssignTicketDialog';
import { StandupView } from '../components/team/StandupView';
import { User } from '../types';
import { Button } from '../components/ui/Button';
import { LayoutGrid, List, History as HistoryIcon, Activity } from 'lucide-react';
import { HeroDatePicker } from '../components/ui/HeroDatePicker';
import { DateRange } from "react-day-picker";
import { motion, AnimatePresence } from 'framer-motion';
import { PageToolbar } from '../components/layout/PageToolbar';
import { DashboardOverview } from '../components/dashboard/DashboardOverview';


import { cn } from '@/lib/utils';

export const TeamBoard: React.FC = () => {
    const { data } = useData();
    const [isStandupMode, setIsStandupMode] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [assignDialogState, setAssignDialogState] = useState<{ isOpen: boolean; user: User | null }>({
        isOpen: false,
        user: null
    });

    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: new Date(),
        to: new Date(),
    });

    const openAssignDialog = (user: User) => {
        setAssignDialogState({ isOpen: true, user });
    };

    const closeAssignDialog = () => {
        setAssignDialogState({ isOpen: false, user: null });
    };

    // Filter Users (removed role/status filters as requested)
    const filteredUsers = data.users;

    const sortedUsers = [...filteredUsers].sort((a, b) => {
        if (a.status === 'online' && b.status !== 'online') return -1;
        if (a.status !== 'online' && b.status === 'online') return 1;
        return a.name.localeCompare(b.name);
    });

    return (
        <div className="flex flex-col">
            <div className="pt-4 md:pt-8">
                <PageToolbar 
                    title="Dashboard"
                    hideTitleDivider={true}
                    filters={
                        <div className="flex items-center gap-2">
                            {/* Standup History Button */}
                            {isStandupMode && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setIsHistoryOpen(true)}
                                    className="text-muted-foreground hover:text-foreground flex gap-2 h-9"
                                >
                                    <HistoryIcon size={16} />
                                    Past Standups
                                </Button>
                            )}

                            {!isStandupMode && (
                                <>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                                        className={cn(
                                            "text-muted-foreground hover:text-foreground flex gap-2 h-9",
                                            isSidebarOpen && "text-foreground bg-zinc-100 dark:bg-zinc-800"
                                        )}
                                    >
                                        <Activity size={16} />
                                        Activity
                                    </Button>

                                    <div className="h-4 w-[1px] bg-border mx-1" />

                                    <HeroDatePicker 
                                        date={dateRange}
                                        setDate={setDateRange}
                                    />
                                </>
                            )}
                        </div>
                    }
                    actions={
                        <div className="flex items-center p-1 bg-zinc-100 dark:bg-zinc-800 rounded-md h-9 shrink-0">
                            <button
                                onClick={() => setIsStandupMode(false)}
                                className={cn(
                                    "relative flex items-center gap-2 px-3 text-xs font-semibold rounded-sm transition-colors h-7",
                                    !isStandupMode ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {!isStandupMode && (
                                    <motion.div
                                        layoutId="view-toggle"
                                        className="absolute inset-0 bg-white dark:bg-zinc-950 shadow-sm rounded-sm ring-1 ring-black/5 dark:ring-white/10"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                                <span className="relative z-10 flex items-center gap-2">
                                    <LayoutGrid size={14} />
                                    Board
                                </span>
                            </button>
                            <button
                                onClick={() => setIsStandupMode(true)}
                                className={cn(
                                    "relative flex items-center gap-2 px-3 text-xs font-semibold rounded-sm transition-colors h-7",
                                    isStandupMode ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {isStandupMode && (
                                    <motion.div
                                        layoutId="view-toggle"
                                        className="absolute inset-0 bg-white dark:bg-zinc-950 shadow-sm rounded-sm ring-1 ring-black/5 dark:ring-white/10"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                                <span className="relative z-10 flex items-center gap-2">
                                    <List size={14} />
                                    Standup
                                </span>
                            </button>
                        </div>
                    }
                />
            </div>

            <div className="mt-4">
                <DashboardOverview />
            </div>

            <div className={cn("flex items-start mt-4", isSidebarOpen && !isStandupMode ? "gap-8" : "")}>
                <main className="flex-1 min-w-0 space-y-4">
                    <AnimatePresence mode="wait">
                        {isStandupMode ? (
                            <motion.div
                                key="standup-view"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="h-full"
                            >
                                <StandupView 
                                    isHistoryOpen={isHistoryOpen} 
                                    onToggleHistory={setIsHistoryOpen} 
                                />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="board-view"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.3 }}
                                className="flex flex-col gap-4"
                            >
                                {sortedUsers.map(user => (
                                    <DeveloperRow 
                                        key={user.id} 
                                        user={user} 
                                        dateRange={dateRange}
                                        onPickTicket={() => openAssignDialog(user)} 
                                    />
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </main>

                {!isStandupMode && (
                    <aside className="sticky top-6">
                        <div 
                            className={`shrink-0 hidden xl:block transition-all duration-300 ease-in-out overflow-hidden ${
                                isSidebarOpen ? 'w-80 opacity-100 translate-x-0' : 'w-0 opacity-0 translate-x-10'
                            }`}
                        >
                            <div className="w-80">
                                <ActivityFeed />
                            </div>
                        </div>
                    </aside>
                )}
            </div>

            {assignDialogState.user && (
                <AssignTicketDialog 
                    isOpen={assignDialogState.isOpen} 
                    onClose={closeAssignDialog} 
                    developer={assignDialogState.user} 
                />
            )}
        </div>
    );
};
