'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@components/ui/input';
import { Button } from '@components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import Footer from '@components/layouts/footer';
import { api } from '@/config/api';
import { Eye, EyeOff, Info } from 'lucide-react';
import AuthTemplate from './AuthTemplate';

interface ValidateActivationResponse {
    valid: boolean;
}

const ComponentActivate = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const activationCode = searchParams.get('code');

    const [formData, setFormData] = useState({
        email: '',
        contact: '',
        username: '',
        password: '',
        confirmPassword: '',
    });
    const [isValidated, setIsValidated] = useState(false);
    const [responseMessage, setResponseMessage] = useState({
        text: !isValidated ? 'Enter your email & contact to verify' : 'Create your password',
        type: 'info',
    });
    const [fieldErrors, setFieldErrors] = useState({
        username: false,
        password: false,
        confirmPassword: false,
        contact: false,
        email: false,
    });
    const [showPassword, setShowPassword] = useState({
        password: false,
        confirmPassword: false,
    });
    const [userType, setUserType] = useState<number | null>(null);

    // --- Unnecessary: useEffect for activationCode error message (not performance related) ---
    useEffect(() => {
        if (!activationCode) {
            setResponseMessage({ text: 'Invalid activation link', type: 'error' });
        }
    }, [activationCode]);

    // --- Unnecessary: handleChange, handleKeyPress, togglePassword (UI only) ---
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement> | { target: { id: string; value: string } }) => {
        const { id, value } = e.target;
        setFormData((prevData) => ({
            ...prevData,
            [id]: value,
        }));
        setFieldErrors((prev) => ({
            ...prev,
            [id]: false,
        }));
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        const charCode = e.key;
        if (!/^[0-9]$/.test(charCode)) {
            e.preventDefault();
        }
    };

    const togglePassword = (field: 'password' | 'confirmPassword') => {
        setShowPassword((prev) => ({
            ...prev,
            [field]: !prev[field],
        }));
    };

    // --- FOCUS: handleValidate and handleActivate are the only performance-relevant parts ---
    const handleValidate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activationCode) {
            setResponseMessage({ text: 'Invalid activation code', type: 'error' });
            return;
        }
        try {
            setResponseMessage({ text: 'Validating...', type: 'info' });
            const response = await api.post('/api/auth/validate-activation', {
                email: formData.email,
                contact: formData.contact,
                activationCode: activationCode,
            });
            const data = response.data as any;
            if (data.status === 'success') {
                setIsValidated(true);
                setUserType(data.user_type ?? null);
                setResponseMessage({
                    text: data.message || 'Validation successful! Create your password',
                    type: 'success',
                });
            } else {
                setResponseMessage({
                    text: data.message || 'Validation failed',
                    type: 'error',
                });
            }
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || 'Validation failed';
            setResponseMessage({ text: errorMessage, type: 'error' });
        }
    };

    // Password complexity validation function
    function isPasswordComplex(password: string) {
        // At least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
        return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(password);
    }

    const handleActivate = async (e: React.FormEvent) => {
        e.preventDefault();
        let hasErrors = false;
        const newFieldErrors = { ...fieldErrors };

        // Only require username for Employee (userType === 1)
        if (userType !== 2 && !formData.username) {
            newFieldErrors.username = true;
            setResponseMessage({ text: 'Username is required', type: 'error' });
            hasErrors = true;
        }

        // Password complexity check
        if (!isPasswordComplex(formData.password)) {
            newFieldErrors.password = true;
            setResponseMessage({ text: 'Password does not meet complexity requirements', type: 'error' });
            hasErrors = true;
        }

        // Confirm password match
        if (formData.password !== formData.confirmPassword) {
            newFieldErrors.password = true;
            newFieldErrors.confirmPassword = true;
            setResponseMessage({ text: 'Passwords do not match', type: 'error' });
            hasErrors = true;
        }

        setFieldErrors(newFieldErrors);
        if (hasErrors) return;

        // Ramco ID validation for Employee
        if (userType === 1 && formData.username) {
            try {
                setResponseMessage({ text: 'Validating Ramco ID...', type: 'info' });
                const res = await api.get(`/api/assets/employees/ramco/${formData.username}`);
                const empRes = res.data as { status?: string; data?: { email?: string; contact?: string } };
                if (empRes.status !== 'success' || !empRes.data || !empRes.data.email || !empRes.data.contact) {
                    setResponseMessage({ text: 'Employee data not found or incomplete for this Ramco ID.', type: 'error' });
                    return;
                }
                if (empRes.data.email.toLowerCase() !== formData.email.toLowerCase() || empRes.data.contact !== formData.contact) {
                    setResponseMessage({ text: 'Your email/contact does not match our employee records. Please use your company email/contact.', type: 'error' });
                    return;
                }
            } catch (err: any) {
                setResponseMessage({ text: 'Failed to validate Ramco ID. Please check your entry.', type: 'error' });
                return;
            }
        }

        try {
            setResponseMessage({ text: 'Activating account...', type: 'info' });
            await api.post('/api/auth/activate', {
                email: formData.email,
                contact: formData.contact,
                username: formData.username,
                password: formData.password,
                activationCode: activationCode,
            });
            setResponseMessage({
                text: 'Account activated successfully! Redirecting...',
                type: 'success',
            });
            setTimeout(() => {
                router.push('/auth/login');
            }, 2000);
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || 'Activation failed';
            setResponseMessage({ text: errorMessage, type: 'error' });
        }
    };

    return (
        <AuthTemplate title="Activate Account" description={responseMessage.text || "Set your account password to activate your ADMS account."}>
            <form className="space-y-3" onSubmit={!isValidated ? handleValidate : handleActivate}>
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                    <Input
                        id="email"
                        type="email"
                        placeholder="Enter Email"
                        value={formData.email}
                        onChange={handleChange}
                        disabled={isValidated}
                    />
                </div>

                <div>
                    <label htmlFor="contact" className="block text-sm font-medium text-gray-700">Contact</label>
                    <Input
                        id="contact"
                        type="text"
                        placeholder="Enter Contact"
                        value={formData.contact}
                        onChange={handleChange}
                        onKeyPress={handleKeyPress}
                        disabled={isValidated}
                    />
                </div>

                {isValidated && (
                    <>
                        <div>
                            <label htmlFor="username" className="text-sm font-medium text-gray-700">Username</label>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="relative flex items-center">
                                            <Input
                                                id="username"
                                                type="text"
                                                placeholder="Enter Ramco ID (for employees) or blank for non-employees"
                                                value={formData.username}
                                                onChange={handleChange}
                                                onFocus={e => e.currentTarget.setAttribute('data-state', 'open')}
                                                onBlur={e => e.currentTarget.removeAttribute('data-state')}
                                                inputMode="numeric"
                                                pattern="[0-9]*"
                                                onKeyPress={e => {
                                                    if (!/^[0-9]$/.test(e.key)) {
                                                        e.preventDefault();
                                                    }
                                                }}
                                                readOnly={userType === 2}
                                            />
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent className='max-w-xs text-wrap'>
                                        <p>
                                            {userType === 1 && 'You have registered as an Employee. '}
                                            {userType === 2 && 'You have registered as a Non-Employee. '}
                                            For employees, please enter your Ramco ID or leave blank for non-employee.<br />
                                        </p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="relative">
                                            <Input
                                                id="password"
                                                type={showPassword.password ? 'text' : 'password'}
                                                placeholder="Enter Password"
                                                value={formData.password}
                                                onChange={handleChange}
                                            />
                                            <span
                                                className="absolute inset-y-0 right-0 flex items-center pr-5 text-gray-500 hover:text-red-500 hover:shadow-2xl cursor-pointer"
                                                onClick={() => togglePassword('password')}
                                                tabIndex={0}
                                                aria-label="Show/hide password"
                                            >
                                                {showPassword.password ? <EyeOff /> : <Eye />}
                                            </span>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent className='max-w-xs text-wrap'>
                                        <p>
                                            Password must be at least 8 characters and include uppercase, lowercase, number, and special character.
                                        </p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>

                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Confirm Password</label>
                            <div className="relative">
                                <Input
                                    id="confirmPassword"
                                    type={showPassword.confirmPassword ? 'text' : 'password'}
                                    placeholder="Confirm Password"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                />
                                <span
                                    className="absolute inset-y-0 right-0 flex items-center pr-5 text-gray-500 hover:text-red-500"
                                    onClick={() => togglePassword('confirmPassword')}
                                >
                                    {showPassword.confirmPassword ? <EyeOff /> : <Eye />}
                                </span>
                            </div>
                        </div>
                    </>
                )}

                <Button type="submit" size="default" className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 rounded transition">
                    {!isValidated ? 'Verify' : 'Activate Account'}
                </Button>
            </form>

        </AuthTemplate>
    );
};

export default ComponentActivate