'use client';
import IconCalendar from '@/components/icon/icon-calendar';
import IconCoffee from '@/components/icon/icon-coffee';
import IconMail from '@/components/icon/icon-mail';
import IconMapPin from '@/components/icon/icon-map-pin';
import IconPencilPaper from '@/components/icon/icon-pencil-paper';
import IconPhone from '@/components/icon/icon-phone';
import Link from 'next/link';
import React, { useState, useRef, useCallback, useEffect, useContext } from 'react';
import { authenticatedApi } from '@/config/api';
import { AuthContext } from '@/store/AuthContext';
import { ToastProvider, ToastViewport, ToastDescription, ToastClose, Toast } from "@/components/layouts/ui/toast";

const Profile = () => {
    const authContext = useContext(AuthContext);
    const user = authContext?.authData?.user;
    const [form, setForm] = useState({
        name: '',
        email: '',
        phone: '',
        dob: '',
        location: '',
        job: '',
    });
    const [image, setImage] = useState<File | null>(null);
    const [preview, setPreview] = useState<string>('/assets/images/profile-34.jpeg');
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Toast state (c-group pattern)
    const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    useEffect(() => {
        if (user) {
            setForm({
                name: user.name || '',
                email: user.email || '',
                phone: user.contact || '',
                dob: user.profile?.dob || '',
                location: user.profile?.location || '',
                job: user.profile?.job || '',
            });
            if (user.profile?.profile_image_url) {
                setPreview(user.profile.profile_image_url);
            }
        }
    }, [user]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImage(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('image/')) {
            setImage(file);
            setPreview(URL.createObjectURL(file));
        }
    }, []);

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('name', form.name);
            formData.append('email', form.email);
            formData.append('phone', form.phone);
            formData.append('dob', form.dob);
            formData.append('location', form.location);
            formData.append('job', form.job);
            if (image) {
                formData.append('profileImage', image);
            } else if (preview && !preview.startsWith('/assets/images/profile-34.jpeg')) {
                formData.append('profile_image_url', preview);
            }
            const res = await authenticatedApi.put('/api/users/update-profile', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setToast({ type: 'success', message: (res.data as any)?.message || 'Your profile was updated successfully.' });
            // Update AuthContext directly with the latest form data and preview
            if (authContext?.authData && authContext.setAuthData) {
                const updatedUser = {
                    ...authContext.authData.user,
                    name: form.name,
                    email: form.email,
                    contact: form.phone,
                    profile: {
                        ...authContext.authData.user.profile,
                        dob: form.dob,
                        location: form.location,
                        job: form.job,
                        profile_image_url: image ? preview : (preview && !preview.startsWith('/assets/images/profile-34.jpeg') ? preview : authContext.authData.user.profile.profile_image_url),
                    },
                };
                authContext.setAuthData({
                    ...authContext.authData,
                    user: updatedUser,
                });
            }
        } catch (err: any) {
            setToast({ type: 'error', message: err?.response?.data?.message || 'Failed to update profile' });
        } finally {
            setLoading(false);
        }
    };

    // Add Task type
    interface Task {
        id: number;
        title: string;
        completed: boolean;
        progress: number;
        done: string;
        time: string;
    }

    // Task management state
    const [tasks, setTasks] = useState<Task[]>([]);
    const [newTask, setNewTask] = useState('');
    const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
    const [editTaskTitle, setEditTaskTitle] = useState('');
    const [editProgress, setEditProgress] = useState<number>(0);

    const fetchTasks = async () => {
        try {
            const res = await authenticatedApi.get('/api/users/tasks');
            setTasks((res.data as any).tasks || []);
        } catch (err: any) {
            setToast({ type: 'error', message: err?.response?.data?.message || 'Could not load tasks' });
        }
    };

    useEffect(() => {
        // Set name, email, phone from AuthContext
        setForm((prev) => ({
            ...prev,
            name: user?.name || '',
            email: user?.email || '',
            phone: user?.contact || '',
        }));
    }, [user]);

    useEffect(() => {
        fetchTasks(); // Fetch tasks on initial mount
    }, []);

    const handleAddTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTask.trim()) return;
        try {
            const res = await authenticatedApi.post('/api/users/tasks', { title: newTask, progress: 0 });
            setNewTask('');
            fetchTasks();
            setToast({ type: 'success', message: (res.data as any)?.message || 'Task added successfully.' });
        } catch (err: any) {
            setToast({ type: 'error', message: err?.response?.data?.message || 'Failed to add task' });
        }
    };

    const handleUpdateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTask.trim() || editingTaskId === null) return;
        try {
            const res = await authenticatedApi.put(`/api/users/tasks/${editingTaskId}`, {
                title: newTask,
                progress: editProgress,
                completed: editProgress === 100,
            });
            setEditingTaskId(null);
            setNewTask('');
            setEditProgress(0);
            fetchTasks();
            setToast({ type: 'success', message: (res.data as any)?.message || 'Task updated successfully.' });
        } catch (err: any) {
            setToast({ type: 'error', message: err?.response?.data?.message || 'Failed to update task' });
        }
    };

    const handleToggleTask = async (id: number) => {
        const task = tasks.find(t => t.id === id);
        if (!task) return;
        try {
            const res = await authenticatedApi.put(`/api/users/tasks/${id}`, {
                ...task,
                completed: !task.completed,
                progress: !task.completed ? 100 : task.progress,
            });
            fetchTasks();
            setToast({ type: 'success', message: (res.data as any)?.message || 'Task status updated.' });
        } catch (err: any) {
            setToast({ type: 'error', message: err?.response?.data?.message || 'Failed to update task' });
        }
    };

    const handleEditClick = (task: Task) => {
        setEditingTaskId(task.id);
        setEditTaskTitle(task.title);
        setEditProgress(task.progress);
        setNewTask(task.title);
    };

    const handleEditProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = Math.max(0, Math.min(100, Number(e.target.value)));
        setEditProgress(value);
    };

    const handleCancelEdit = () => {
        setEditingTaskId(null);
        setNewTask('');
        setEditProgress(0);
    };

    return (
        <ToastProvider>
            <div>
                {toast && (
                    <Toast
                        color={toast.type === 'success' ? 'success' : 'error'}
                        position={{ vertical: 'top', horizontal: 'center' }}
                        open
                        onOpenChange={() => setToast(null)}
                    >
                        <ToastDescription>{toast.message}</ToastDescription>
                        <ToastClose />
                    </Toast>
                )}
                <ul className="flex space-x-2 rtl:space-x-reverse">
                    <li>
                        <Link href="#" className="text-primary hover:underline">
                            Users
                        </Link>
                    </li>
                    <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                        <span>Profile</span>
                    </li>
                </ul>
                <div className="pt-5">
                    <div className="mb-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
                        <div className="panel w-full max-w-2xl mx-auto lg:mx-0">
                            <div className="mb-5">
                                <h5 className="text-lg font-semibold dark:text-white-light flex items-center gap-2">
                                    <IconPencilPaper className="text-primary" /> Update Profile
                                </h5>
                            </div>
                            <form className="space-y-6" onSubmit={handleSubmit} encType="multipart/form-data">
                                <div className="flex flex-col items-center">
                                    <div
                                        className="mb-3 h-24 w-24 rounded-full border flex items-center justify-center bg-gray-50 relative cursor-pointer hover:shadow-lg transition"
                                        onDrop={handleDrop}
                                        onDragOver={handleDragOver}
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <img
                                            src={preview}
                                            alt="Profile Preview"
                                            className="h-24 w-24 rounded-full object-cover"
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 rounded-full transition">
                                            <span className="text-white text-xs font-semibold">Drop or Click to Change</span>
                                        </div>
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        name="profileImage"
                                        ref={fileInputRef}
                                        onChange={handleImageChange}
                                        className="hidden"
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="relative">
                                        <label className="block mb-1 font-medium">Name</label>
                                        <span className="absolute left-3 top-9 text-gray-400 pointer-events-none">
                                            <IconCoffee className="w-4 h-4" />
                                        </span>
                                        <input
                                            type="text"
                                            name="name"
                                            value={form.name}
                                            onChange={handleChange}
                                            className="form-input w-full pl-10"
                                            required
                                        />
                                    </div>
                                    <div className="relative">
                                        <label className="block mb-1 font-medium">Email</label>
                                        <span className="absolute left-3 top-9 text-gray-400 pointer-events-none">
                                            <IconMail className="w-4 h-4" />
                                        </span>
                                        <input
                                            type="email"
                                            name="email"
                                            value={form.email}
                                            onChange={handleChange}
                                            className="form-input w-full pl-10"
                                            required
                                        />
                                    </div>
                                    <div className="relative">
                                        <label className="block mb-1 font-medium">Phone</label>
                                        <span className="absolute left-3 top-9 text-gray-400 pointer-events-none">
                                            <IconPhone className="w-4 h-4" />
                                        </span>
                                        <input
                                            type="text"
                                            name="phone"
                                            value={form.phone}
                                            onChange={handleChange}
                                            className="form-input w-full pl-10"
                                        />
                                    </div>
                                    <div className="relative">
                                        <label className="block mb-1 font-medium">Date of Birth</label>
                                        <span className="absolute left-3 top-9 text-gray-400 pointer-events-none">
                                            <IconCalendar className="w-4 h-4" />
                                        </span>
                                        <input
                                            type="date"
                                            name="dob"
                                            value={form.dob}
                                            onChange={handleChange}
                                            className="form-input w-full pl-10"
                                        />
                                    </div>
                                    <div className="md:col-span-2 relative">
                                        <label className="block mb-1 font-medium">Location</label>
                                        <span className="absolute left-3 top-9 text-gray-400 pointer-events-none">
                                            <IconMapPin className="w-4 h-4" />
                                        </span>
                                        <input
                                            type="text"
                                            name="location"
                                            value={form.location}
                                            onChange={handleChange}
                                            className="form-input w-full pl-10"
                                        />
                                    </div>
                                    <div className="md:col-span-2 relative">
                                        <label className="block mb-1 font-medium">Job Title</label>
                                        <span className="absolute left-3 top-9 text-gray-400 pointer-events-none">
                                            <IconCoffee className="w-4 h-4" />
                                        </span>
                                        <input
                                            type="text"
                                            name="job"
                                            value={form.job}
                                            onChange={handleChange}
                                            className="form-input w-full pl-10"
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-center">
                                    <button
                                        type="submit"
                                        className="btn bg-amber-500 text-white hover:bg-amber-600 rounded-full border-none"
                                        disabled={loading}
                                    >
                                        {loading ? 'Updating...' : 'Update Profile'}
                                    </button>
                                </div>
                            </form>
                        </div>
                        <div className="panel w-full max-w-2xl mx-auto lg:mx-0">
                            <div className="mb-5">
                                <h5 className="text-lg font-semibold dark:text-white-light">Task</h5>
                            </div>
                            <form onSubmit={editingTaskId === null ? handleAddTask : handleUpdateTask} className="flex gap-2 mb-4 items-end">
                                <div className="flex-1">
                                    <input
                                        type="text"
                                        className="form-input w-full"
                                        placeholder="Add new task..."
                                        value={newTask}
                                        onChange={e => setNewTask(e.target.value)}
                                    />
                                </div>
                                {editingTaskId !== null && (
                                    <div className="flex flex-col">
                                        <label className="text-xs font-medium mb-1">Progress</label>
                                        <input
                                            type="number"
                                            min={0}
                                            max={100}
                                            value={editProgress}
                                            onChange={handleEditProgressChange}
                                            className="form-input w-20"
                                        />
                                    </div>
                                )}
                                <button type="submit" className={`btn border-none rounded-full shadown-none text-white ${editingTaskId === null ? 'bg-blue-500 hover:bg-blue-600' : 'bg-amber-500 text-white hover:bg-amber-600'}`}>
                                    {editingTaskId === null ? 'Add' : 'Update'}
                                </button>
                                {editingTaskId !== null && (
                                    <button type="button" className="btn border-none rounded-full shadown-none text-white bg-gray-400 hover:bg-gray-500 ml-2" onClick={handleCancelEdit}>
                                        Cancel
                                    </button>
                                )}
                            </form>
                            <div className="mb-5">
                                <div className="table-responsive font-semibold text-[#515365] dark:text-white-light">
                                    <table className="whitespace-nowrap w-full">
                                        <thead>
                                            <tr>
                                                <th className="w-10"></th>
                                                <th>Task</th>
                                                <th>Progress</th>
                                                <th>Task Done</th>
                                                <th className="text-center">Time</th>
                                            </tr>
                                        </thead>
                                        <tbody className="dark:text-white-dark">
                                            {tasks.filter(task => task && typeof task.completed === 'boolean').map(task => (
                                                <tr key={task.id}>
                                                    <td className="text-center flex items-center gap-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={task.completed}
                                                            onChange={() => handleToggleTask(task.id)}
                                                            className="form-checkbox h-5 w-5 text-primary"
                                                        />
                                                        {!task.completed && (
                                                            <button type="button" className="p-1.5" style={{ background: 'none', border: 'none' }} onClick={() => handleEditClick(task)}>
                                                                <IconPencilPaper className="w-4 h-4 text-primary" />
                                                            </button>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <span className={task.completed ? 'line-through text-gray-400' : ''}>{task.title}</span>
                                                    </td>
                                                    <td>
                                                        <div className="flex h-1.5 w-full rounded-full bg-[#ebedf2] dark:bg-dark/40 mt-2">
                                                            <div className={`rounded-full ${task.completed ? 'bg-success w-full' : 'bg-info'}`} style={{ width: `${task.progress}%` }}></div>
                                                        </div>
                                                    </td>
                                                    <td className={task.completed ? 'text-success' : ''}>{task.done}</td>
                                                    <td className="text-center">{task.time}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <ToastViewport />
        </ToastProvider>
    );
};

export default Profile;
