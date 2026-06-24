import React from 'react';
import { PageToolbar } from '../components/layout/PageToolbar';
import { DashboardOverview } from '../components/dashboard/DashboardOverview';

export const TeamBoard: React.FC = () => {
    return (
        <div className="flex flex-col">
            <div className="pt-4 md:pt-8">
                <PageToolbar title="Dashboard" hideTitleDivider={true} />
            </div>

            <DashboardOverview />
        </div>
    );
};
