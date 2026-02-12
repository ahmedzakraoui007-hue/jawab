'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Card } from '@/components/ui';
import {
    Building,
    MapPin,
    Clock,
    Scissors,
    MessageSquare,
    Sparkles,
    ArrowRight,
    ArrowLeft,
    Check,
    Plus,
    Trash2,
    Loader2,
    AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { doc, setDoc, updateDoc, Timestamp } from 'firebase/firestore';

const steps = [
    { id: 1, title: 'Business Info', icon: Building },
    { id: 2, title: 'Location & Hours', icon: MapPin },
    { id: 3, title: 'Services', icon: Scissors },
    { id: 4, title: 'Connect WhatsApp', icon: MessageSquare },
    { id: 5, title: 'Test AI', icon: Sparkles },
];

const industries = [
    { id: 'salon', label: 'Beauty Salon', icon: '💇‍♀️' },
    { id: 'spa', label: 'Spa & Wellness', icon: '💆‍♀️' },
    { id: 'restaurant', label: 'Restaurant', icon: '🍽️' },
    { id: 'clinic', label: 'Clinic', icon: '🏥' },
    { id: 'gym', label: 'Gym & Fitness', icon: '🏋️' },
    { id: 'other', label: 'Other', icon: '🏢' },
];

const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function OnboardingPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [currentStep, setCurrentStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [validationError, setValidationError] = useState<string | null>(null);

    // Form state
    const [businessData, setBusinessData] = useState({
        name: '',
        industry: '',
        description: '',
        address: '',
        city: 'Dubai',
        area: '',
        googleMapsLink: '',
        hours: Object.fromEntries(days.map(day => [day, { open: '10:00', close: '22:00', closed: day === 'monday' }])),
        services: [
            { id: '1', name: '', price: '', duration: '45' },
        ],
    });

    // Step validation
    const validateStep = (step: number): string | null => {
        switch (step) {
            case 1:
                if (!businessData.name.trim()) return 'Please enter your business name';
                return null;
            case 2:
                if (!businessData.address.trim()) return 'Please enter your business address';
                return null;
            case 3: {
                const validServices = businessData.services.filter(
                    s => s.name.trim() && s.price
                );
                if (validServices.length === 0) return 'Please add at least one service with a name and price';
                return null;
            }
            default:
                return null;
        }
    };

    const handleNext = () => {
        const err = validateStep(currentStep);
        if (err) {
            setValidationError(err);
            return;
        }
        setValidationError(null);
        if (currentStep < 5) {
            setCurrentStep(prev => prev + 1);
        }
    };

    const handleBack = () => {
        setValidationError(null);
        if (currentStep > 1) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const handleComplete = async () => {
        if (!user || !db) return;

        setIsLoading(true);
        setError(null);

        try {
            const businessId = `biz_${user.uid}`;
            const now = Timestamp.now();

            // Transform hours into Firestore format
            const hours: Record<string, { open: string; close: string } | null> = {};
            for (const day of days) {
                const h = businessData.hours[day];
                hours[day] = h?.closed ? null : { open: h?.open || '10:00', close: h?.close || '22:00' };
            }

            // Transform services — filter out empty, convert numbers
            const services = businessData.services
                .filter(s => s.name.trim())
                .map(s => ({
                    name: s.name.trim(),
                    price: Number(s.price) || 0,
                    duration: Number(s.duration) || 45,
                }));

            // Create business document
            await setDoc(doc(db, 'businesses', businessId), {
                id: businessId,
                ownerId: user.uid,
                name: businessData.name.trim(),
                industry: businessData.industry || 'other',
                description: businessData.description.trim(),
                address: businessData.address.trim(),
                location: `${businessData.area.trim()}, ${businessData.city.trim()}`.replace(/^, |, $/, ''),
                timezone: 'Asia/Dubai',
                hours,
                services,
                customFaqs: [],
                tone: 'friendly',
                staffIds: [user.uid],
                googleMapsLink: businessData.googleMapsLink.trim() || null,
                createdAt: now,
                updatedAt: now,
            });

            // Update user document
            await updateDoc(doc(db, 'users', user.uid), {
                businessId,
                onboardingComplete: true,
                updatedAt: now,
            });

            router.push('/dashboard');
        } catch (err) {
            console.error('[Onboarding] Save error:', err);
            setError('Failed to save your business. Please try again.');
            setIsLoading(false);
        }
    };

    const addService = () => {
        setBusinessData(prev => ({
            ...prev,
            services: [...prev.services, { id: Date.now().toString(), name: '', price: '', duration: '45' }],
        }));
    };

    const removeService = (id: string) => {
        setBusinessData(prev => ({
            ...prev,
            services: prev.services.filter(s => s.id !== id),
        }));
    };

    const updateService = (id: string, field: string, value: string) => {
        setBusinessData(prev => ({
            ...prev,
            services: prev.services.map(s => s.id === id ? { ...s, [field]: value } : s),
        }));
    };

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-50 to-transparent pointer-events-none" />
            <div className="absolute top-20 right-20 w-64 h-64 bg-blue-100 rounded-full blur-[100px] opacity-60 pointer-events-none" />
            <div className="absolute bottom-20 left-20 w-72 h-72 bg-green-100 rounded-full blur-[100px] opacity-40 pointer-events-none" />

            <div className="max-w-2xl mx-auto relative z-10">
                {/* Logo */}
                <div className="flex items-center justify-center gap-2 mb-10">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-green-500 flex items-center justify-center shadow-lg">
                        <span className="text-xl font-bold text-white">ج</span>
                    </div>
                    <span className="text-2xl font-bold text-gray-900">Jawab</span>
                </div>

                {/* Progress Steps */}
                <div className="flex items-center justify-between mb-10 px-4">
                    {steps.map((step, index) => (
                        <div key={step.id} className="flex items-center">
                            <div className={`
                w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 relative z-10
                ${currentStep > step.id
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : currentStep === step.id
                                        ? 'bg-white border-2 border-blue-600 text-blue-600 shadow-md transform scale-110'
                                        : 'bg-white border-2 border-gray-200 text-gray-400'
                                }
              `}>
                                {currentStep > step.id ? (
                                    <Check className="w-5 h-5" />
                                ) : (
                                    <step.icon className="w-5 h-5" />
                                )}
                            </div>
                            {index < steps.length - 1 && (
                                <div className={`w-12 h-0.5 mx-2 transition-colors duration-300 ${currentStep > step.id ? 'bg-blue-600' : 'bg-gray-200'
                                    }`}></div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Step Content */}
                <Card variant="default" padding="lg" className="bg-white border-gray-200 shadow-xl">
                    {/* Step 1: Business Info */}
                    {currentStep === 1 && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">Tell us about your business</h2>
                                <p className="text-gray-500">We'll use this to customize your AI assistant</p>
                            </div>

                            <Input
                                label="Business Name"
                                placeholder="Glamour Ladies Salon"
                                value={businessData.name}
                                onChange={(e) => setBusinessData(prev => ({ ...prev, name: e.target.value }))}
                            />

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                    Industry
                                </label>
                                <div className="grid grid-cols-3 gap-3">
                                    {industries.map(industry => (
                                        <button
                                            key={industry.id}
                                            onClick={() => setBusinessData(prev => ({ ...prev, industry: industry.id }))}
                                            className={`p-4 rounded-xl border text-center transition-all ${businessData.industry === industry.id
                                                ? 'bg-blue-50 border-blue-500 shadow-sm'
                                                : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                                }`}
                                        >
                                            <span className="text-2xl block mb-2">{industry.icon}</span>
                                            <span className={`text-sm font-medium ${businessData.industry === industry.id ? 'text-blue-700' : 'text-gray-600'
                                                }`}>{industry.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <Input
                                label="Business Description (Optional)"
                                placeholder="Ladies-only salon specializing in bridal packages..."
                                value={businessData.description}
                                onChange={(e) => setBusinessData(prev => ({ ...prev, description: e.target.value }))}
                            />
                        </div>
                    )}

                    {/* Step 2: Location & Hours */}
                    {currentStep === 2 && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">Location & Working Hours</h2>
                                <p className="text-gray-500">Help customers find you and know when you&apos;re open</p>
                            </div>

                            <Input
                                label="Address"
                                placeholder="Shop 5, Cluster D, JLT"
                                value={businessData.address}
                                onChange={(e) => setBusinessData(prev => ({ ...prev, address: e.target.value }))}
                                leftIcon={<MapPin className="w-5 h-5" />}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="Area"
                                    placeholder="JLT"
                                    value={businessData.area}
                                    onChange={(e) => setBusinessData(prev => ({ ...prev, area: e.target.value }))}
                                />
                                <Input
                                    label="City"
                                    placeholder="Dubai"
                                    value={businessData.city}
                                    onChange={(e) => setBusinessData(prev => ({ ...prev, city: e.target.value }))}
                                />
                            </div>

                            <Input
                                label="Google Maps Link (Optional)"
                                placeholder="https://maps.google.com/..."
                                value={businessData.googleMapsLink}
                                onChange={(e) => setBusinessData(prev => ({ ...prev, googleMapsLink: e.target.value }))}
                            />

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                    Working Hours
                                </label>
                                <div className="space-y-2 border border-gray-200 rounded-lg p-4 bg-gray-50/50">
                                    {days.map(day => (
                                        <div key={day} className="flex items-center gap-3 py-1">
                                            <span className="w-24 text-sm font-medium text-gray-700 capitalize">{day}</span>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={!businessData.hours[day]?.closed}
                                                    onChange={(e) => setBusinessData(prev => ({
                                                        ...prev,
                                                        hours: {
                                                            ...prev.hours,
                                                            [day]: { ...prev.hours[day], closed: !e.target.checked }
                                                        }
                                                    }))}
                                                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                <span className="text-sm text-gray-600 w-12">{!businessData.hours[day]?.closed ? 'Open' : 'Closed'}</span>
                                            </label>
                                            {!businessData.hours[day]?.closed && (
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="time"
                                                        value={businessData.hours[day]?.open || '10:00'}
                                                        onChange={(e) => setBusinessData(prev => ({
                                                            ...prev,
                                                            hours: {
                                                                ...prev.hours,
                                                                [day]: { ...prev.hours[day], open: e.target.value }
                                                            }
                                                        }))}
                                                        className="px-2 py-1 bg-white border border-gray-200 rounded text-sm text-gray-900 focus:outline-none focus:border-blue-500"
                                                    />
                                                    <span className="text-gray-400 text-sm">to</span>
                                                    <input
                                                        type="time"
                                                        value={businessData.hours[day]?.close || '22:00'}
                                                        onChange={(e) => setBusinessData(prev => ({
                                                            ...prev,
                                                            hours: {
                                                                ...prev.hours,
                                                                [day]: { ...prev.hours[day], close: e.target.value }
                                                            }
                                                        }))}
                                                        className="px-2 py-1 bg-white border border-gray-200 rounded text-sm text-gray-900 focus:outline-none focus:border-blue-500"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Services */}
                    {currentStep === 3 && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Services</h2>
                                <p className="text-gray-500">Add your services so Jawab can help customers book</p>
                            </div>

                            <div className="space-y-4">
                                {businessData.services.map((service, index) => (
                                    <div key={service.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-sm font-bold text-gray-500 shrink-0 border border-gray-200 shadow-sm mt-1">
                                            {index + 1}
                                        </div>
                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                                            <div className="md:col-span-3">
                                                <Input
                                                    placeholder="Service Name (e.g. Haircut)"
                                                    value={service.name}
                                                    onChange={(e) => updateService(service.id, 'name', e.target.value)}
                                                    className="bg-white"
                                                />
                                            </div>

                                            <Input
                                                placeholder="Price"
                                                type="number"
                                                value={service.price}
                                                onChange={(e) => updateService(service.id, 'price', e.target.value)}
                                                leftIcon={<span className="text-gray-400 text-xs">AED</span>}
                                                className="bg-white"
                                            />
                                            <Input
                                                placeholder="Duration"
                                                type="number"
                                                value={service.duration}
                                                onChange={(e) => updateService(service.id, 'duration', e.target.value)}
                                                hint="minutes"
                                                className="bg-white"
                                            />
                                        </div>
                                        {businessData.services.length > 1 && (
                                            <button
                                                onClick={() => removeService(service.id)}
                                                className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors mt-1"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <Button variant="secondary" onClick={addService} className="w-full py-3" leftIcon={<Plus className="w-4 h-4" />}>
                                Add Another Service
                            </Button>
                        </div>
                    )}

                    {/* Step 4: Connect WhatsApp */}
                    {currentStep === 4 && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect WhatsApp</h2>
                                <p className="text-gray-500">Link your WhatsApp Business number to start receiving messages</p>
                            </div>

                            <div className="p-8 bg-gray-50 rounded-2xl border border-gray-100 text-center">
                                <div className="w-48 h-48 mx-auto bg-white rounded-xl shadow-sm border border-gray-200 flex items-center justify-center mb-6">
                                    <p className="text-gray-400 font-medium">[QR Code Placeholder]</p>
                                </div>
                                <p className="text-sm font-medium text-gray-900 mb-1">Scan to connect</p>
                                <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">
                                    Open WhatsApp on your phone, go to Linked Devices, and scan this code.
                                </p>
                                <div className="flex items-center gap-4 justify-center max-w-sm mx-auto">
                                    <div className="h-px flex-1 bg-gray-200"></div>
                                    <span className="text-sm text-gray-400 font-medium">OR</span>
                                    <div className="h-px flex-1 bg-gray-200"></div>
                                </div>
                            </div>

                            <Input
                                label="WhatsApp Business Number"
                                placeholder="+971 50 123 4567"
                                hint="Enter your WhatsApp Business API number manually"
                            />

                            <div className="flex items-start gap-4 p-4 bg-amber-50 border border-amber-100 rounded-xl">
                                <div className="p-2 bg-amber-100 rounded-lg shrink-0">
                                    <Sparkles className="w-5 h-5 text-amber-600" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-amber-800 mb-1">Pilot Phase</h4>
                                    <p className="text-sm text-amber-700">
                                        For the pilot, we&apos;ll use the Twilio sandbox. You don&apos;t need to scan anything yet.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 5: Test AI */}
                    {currentStep === 5 && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">Test Your AI Assistant</h2>
                                <p className="text-gray-500">See how Jawab will respond to your customers</p>
                            </div>

                            <div className="p-6 bg-gray-50 rounded-2xl border border-gray-200 space-y-4">
                                <div className="flex justify-start">
                                    <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm max-w-[85%]">
                                        <p className="text-gray-800">Hi, do you have any appointments available tomorrow?</p>
                                    </div>
                                </div>
                                <div className="flex justify-end">
                                    <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm max-w-[85%]">
                                        <p className="text-white">
                                            Hello! 👋 Yes, we have several slots available tomorrow. What service would you like?
                                            <br /><br />
                                            💇‍♀️ Haircut - {businessData.services[0]?.price || '80'} AED<br />
                                            {businessData.services[1] && `💅 ${businessData.services[1].name || 'Mani-Pedi'} - ${businessData.services[1].price || '120'} AED`}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 p-4 bg-green-50 border border-green-100 rounded-xl">
                                <div className="p-2 bg-green-100 rounded-full shrink-0">
                                    <Check className="w-5 h-5 text-green-600" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-green-800 mb-1">AI Configured!</h4>
                                    <p className="text-sm text-green-700">
                                        Jawab is ready to handle your customer messages based on your services and hours.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Error / Validation Messages */}
                    {(validationError || error) && (
                        <div className={`flex items-center gap-3 mt-4 p-3 rounded-lg border ${error ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
                            }`}>
                            <AlertCircle className={`w-5 h-5 shrink-0 ${error ? 'text-red-500' : 'text-amber-500'
                                }`} />
                            <p className={`text-sm font-medium ${error ? 'text-red-700' : 'text-amber-700'
                                }`}>{error || validationError}</p>
                        </div>
                    )}

                    {/* Navigation Buttons */}
                    <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
                        <Button
                            variant="ghost"
                            onClick={handleBack}
                            disabled={currentStep === 1}
                            leftIcon={<ArrowLeft className="w-4 h-4" />}
                            className="text-gray-500 hover:text-gray-900"
                        >
                            Back
                        </Button>
                        {currentStep < 5 ? (
                            <Button
                                onClick={handleNext}
                                rightIcon={<ArrowRight className="w-4 h-4" />}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-8"
                            >
                                Continue
                            </Button>
                        ) : (
                            <Button
                                onClick={handleComplete}
                                isLoading={isLoading}
                                className="bg-green-600 hover:bg-green-700 text-white px-8"
                            >
                                Go to Dashboard
                            </Button>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
}
