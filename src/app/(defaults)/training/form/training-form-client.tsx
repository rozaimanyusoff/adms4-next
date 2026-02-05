'use client';

import TrainingForm from '@/components/training/training-form';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type TrainingFormClientProps = {
    trainingId?: number;
};

const draftKeyForTraining = (trainingId?: number) => (trainingId ? `training-form-draft-${trainingId}` : 'training-form-draft-new');

const TrainingFormClient = ({ trainingId }: TrainingFormClientProps) => {
    const router = useRouter();
    const [confirmOpen, setConfirmOpen] = useState(false);
    const goBackToRecords = () => router.push('/training?tab=records');
    const hasValidId = trainingId === undefined || Number.isFinite(trainingId);
    const isEditing = trainingId !== undefined;

    const shouldConfirmLeave = () => {
        if (typeof window === 'undefined') return false;
        try {
            const raw = localStorage.getItem(draftKeyForTraining(trainingId));
            return Boolean(raw);
        } catch {
            return false;
        }
    };

    const handleBackClick = () => {
        if (shouldConfirmLeave()) {
            setConfirmOpen(true);
        } else {
            goBackToRecords();
        }
    };

    const handleConfirmLeave = () => {
        try {
            localStorage.removeItem(draftKeyForTraining(trainingId));
        } catch { /* ignore */ }
        setConfirmOpen(false);
        goBackToRecords();
    };

    if (!hasValidId) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm uppercase tracking-wide font-bold">Training Management</p>
                        <h1 className="text-2xl font-semibold">Edit Training</h1>
                    </div>
                    <Button variant="ghost" onClick={handleBackClick} className='border border-red-600 hover:bg-red-600 hover:text-white'>
                        <ArrowLeft className="mr-2 size-4" />
                        Back to records
                    </Button>
                </div>
                <p className="text-destructive">Invalid training id.</p>
            </div>
        );
    }

    return (
        <>
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm uppercase tracking-wide font-bold">Training Management</p>
                    <h1 className="text-2xl font-semibold">{isEditing ? 'Edit Training' : 'Register Training'}</h1>
                </div>
                <Button variant="ghost" onClick={handleBackClick} className='border border-red-600 hover:bg-red-600 hover:text-white'>
                    <ArrowLeft className="mr-2 size-4" />
                    Back to records
                </Button>
            </div>
            <TrainingForm trainingId={trainingId} onSuccess={goBackToRecords} onCancel={goBackToRecords} />
        </div>
            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="size-4 text-amber-500" />
                            Leave without saving?
                        </DialogTitle>
                        <DialogDescription>
                            You have unsaved changes. Leaving will discard the draft.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                            Stay
                        </Button>
                        <Button variant="destructive" onClick={handleConfirmLeave}>
                            Discard draft &amp; leave
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default TrainingFormClient;
