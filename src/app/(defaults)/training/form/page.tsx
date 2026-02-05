import { Metadata } from 'next';
import TrainingFormClient from './training-form-client';

export const metadata: Metadata = {
    title: 'Register Training',
    description: 'Create a new training record with allocations and participants.',
};

const TrainingFormCreatePage = () => {
    return <TrainingFormClient />;
};

export default TrainingFormCreatePage;
