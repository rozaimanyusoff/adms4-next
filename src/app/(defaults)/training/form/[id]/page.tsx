import { Metadata } from 'next';
import TrainingFormClient from '../training-form-client';

type PageProps = {
    params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const resolved = await params;
    const idValue = Array.isArray(resolved.id) ? resolved.id[0] : resolved.id;
    const label = idValue ? `Edit Training #${idValue}` : 'Edit Training';
    return {
        title: label,
        description: 'Update training details, allocations, and participants.',
    };
}

const TrainingFormEditPage = async ({ params }: PageProps) => {
    const resolved = await params;
    const idValue = Array.isArray(resolved.id) ? resolved.id[0] : resolved.id;
    const trainingId = idValue ? Number(idValue) : undefined;
    return <TrainingFormClient trainingId={trainingId} />;
};

export default TrainingFormEditPage;
