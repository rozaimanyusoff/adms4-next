import { Metadata } from 'next';
import TrainingTabs from '@/components/training/training-tabs';

export const metadata: Metadata = {
    title: 'Training Workspace',
    description: 'Switch between the training dashboard and records.',
};

const TrainingTabPage = () => {
    return (
        <div className="space-y-6">
            <TrainingTabs />
        </div>
    );
};

export default TrainingTabPage;
