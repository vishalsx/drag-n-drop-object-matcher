import React, { useState } from 'react';
import { authService } from '../services/authService';
import { fetchActiveLanguages } from '../services/gameService';
import { SpinnerIcon, UserIcon } from '../components/Icons';
import { Language } from '../types/types';

interface LoginScreenProps {
    orgName?: string;
    param2?: string;
    param3?: string;
    onLoginSuccess: () => void;
    isPublicOrg?: boolean;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ orgName, param2, param3, onLoginSuccess, isPublicOrg }) => {
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState('');
    const [age, setAge] = useState('');
    const [country, setCountry] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
    const [availableLanguages, setAvailableLanguages] = useState<Language[]>([]);
    const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    React.useEffect(() => {
        const loadLangs = async () => {
            try {
                const langs = await fetchActiveLanguages(null); // Load global languages
                setAvailableLanguages(langs);
            } catch (err) {
                console.error('Failed to load languages for registration:', err);
            }
        };
        if (mode === 'register') {
            loadLangs();
        }
    }, [mode]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setIsLoading(true);

        try {
            if (mode === 'register') {
                await authService.register({
                    username,
                    password,
                    email,
                    age: age ? parseInt(age) : undefined,
                    country,
                    phone,
                    address,
                    languages: selectedLanguages
                });
                setSuccess('Registration successful! You can now log in.');
                setMode('login');
                setPassword('');
            } else {
                await authService.login(username, password, orgName, param2, param3);
                onLoginSuccess();
            }
        } catch (err: any) {
            const detail = err.response?.data?.detail;
            setError(typeof detail === 'string' ? detail : 'Authentication failed. Please check your credentials.');
        } finally {
            setIsLoading(false);
        }
    };

    const toggleLanguage = (langName: string) => {
        setSelectedLanguages(prev => {
            if (prev.includes(langName)) {
                return prev.filter(l => l !== langName);
            }
            if (prev.length >= 3) return prev;
            return [...prev, langName];
        });
    };

    return (
        <div className="min-h-screen bg-[#0a0a0c] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
            {/* Animated Mesh Gradient Background */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-teal-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
            </div>

            <div className="z-10 w-full max-w-lg">
                <div className="bg-white/[0.03] backdrop-blur-2xl rounded-[2.5rem] shadow-[0_0_80px_rgba(0,0,0,0.5)] border border-white/10 overflow-hidden">
                    <div className="p-10">
                        <div className="flex flex-col items-center text-center mb-10">
                            <img
                                src="/alphatub-logo.png"
                                alt="alphaTUB"
                                className="w-16 h-16 object-contain drop-shadow-lg mb-6 transition-transform hover:scale-110 cursor-default"
                            />
                            <h1 className="text-3xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60">
                                {orgName ? `${orgName} Internal Access` : (mode === 'login' ? 'Welcome Back' : 'Create Account')}
                            </h1>
                            <p className="text-slate-500 text-sm max-w-[280px]">
                                {mode === 'login' ? 'Please provide your credentials to enter the platform.' : 'Join our global community of learners.'}
                            </p>

                            {(!orgName || isPublicOrg) && (
                                <div className="mt-6 flex p-1 bg-white/5 rounded-xl border border-white/10 w-full max-w-[200px]">
                                    <button
                                        onClick={() => setMode('login')}
                                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${mode === 'login' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                                    >
                                        Login
                                    </button>
                                    <button
                                        onClick={() => setMode('register')}
                                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${mode === 'register' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                                    >
                                        Register
                                    </button>
                                </div>
                            )}
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-2xl text-sm font-medium mb-6 animate-shake text-center">
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 px-4 py-3 rounded-2xl text-sm font-medium mb-6 animate-slideDown text-center">
                                {success}
                            </div>
                        )}

                        <form className="space-y-4" onSubmit={handleSubmit}>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors">
                                    <UserIcon className="w-5 h-5" />
                                </div>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                    placeholder="Username"
                                    className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:border-blue-500/50 focus:bg-white/[0.08] focus:outline-none transition-all placeholder:text-slate-600"
                                    disabled={isLoading}
                                />
                            </div>

                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    placeholder="Password"
                                    className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:border-blue-500/50 focus:bg-white/[0.08] focus:outline-none transition-all placeholder:text-slate-600"
                                    disabled={isLoading}
                                />
                            </div>

                            {mode === 'register' && (
                                <div className="space-y-4 animate-slideDown">
                                    <div className="grid grid-cols-2 gap-4">
                                        <input
                                            type="number"
                                            value={age}
                                            onChange={(e) => setAge(e.target.value)}
                                            placeholder="Age"
                                            className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:border-blue-500/50 focus:bg-white/[0.08] focus:outline-none transition-all placeholder:text-slate-600"
                                            disabled={isLoading}
                                        />
                                        <input
                                            type="text"
                                            value={country}
                                            onChange={(e) => setCountry(e.target.value)}
                                            placeholder="Country"
                                            className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:border-blue-500/50 focus:bg-white/[0.08] focus:outline-none transition-all placeholder:text-slate-600"
                                            disabled={isLoading}
                                        />
                                    </div>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="Email Address"
                                        className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:border-blue-500/50 focus:bg-white/[0.08] focus:outline-none transition-all placeholder:text-slate-600"
                                        disabled={isLoading}
                                    />

                                    {/* Language Selection */}
                                    <div className="space-y-3 pt-2">
                                        <div className="flex items-center justify-between px-1">
                                            <label className="text-sm font-bold text-slate-400">Preferred Languages (Max 3)</label>
                                            <span className="text-xs font-medium text-blue-400">{selectedLanguages.length}/3</span>
                                        </div>

                                        {/* Dropdown Header */}
                                        <button
                                            type="button"
                                            onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                                            className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between group hover:bg-white/[0.08] transition-all"
                                        >
                                            <div className="flex flex-wrap gap-1.5 overflow-hidden">
                                                {selectedLanguages.length > 0 ? (
                                                    selectedLanguages.map((lang) => (
                                                        <span
                                                            key={lang}
                                                            className="px-2 py-0.5 bg-blue-600/20 text-blue-400 text-[10px] font-bold rounded-lg border border-blue-500/20"
                                                        >
                                                            {lang}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-slate-600">Select Languages</span>
                                                )}
                                            </div>
                                            <svg
                                                className={`w-4 h-4 text-slate-500 transition-transform duration-300 ${isLangDropdownOpen ? 'rotate-180' : ''}`}
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>

                                        {/* Dropdown List (Relative flow to avoid overlap) */}
                                        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isLangDropdownOpen ? 'max-h-64 mt-2 opacity-100' : 'max-h-0 opacity-0'}`}>
                                            <div className="p-2 bg-white/5 border border-white/10 rounded-2xl grid grid-cols-1 gap-1 custom-scrollbar overflow-y-auto max-h-56">
                                                {availableLanguages.length > 0 ? (
                                                    availableLanguages.map((lang) => {
                                                        const isSelected = selectedLanguages.includes(lang.name);
                                                        const isMaxReached = selectedLanguages.length >= 3 && !isSelected;
                                                        return (
                                                            <button
                                                                key={lang.code}
                                                                type="button"
                                                                disabled={isMaxReached}
                                                                onClick={() => toggleLanguage(lang.name)}
                                                                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${isSelected
                                                                    ? 'bg-blue-600/10 text-blue-400'
                                                                    : isMaxReached
                                                                        ? 'opacity-40 cursor-not-allowed'
                                                                        : 'hover:bg-white/10 text-slate-400 hover:text-slate-200'
                                                                    }`}
                                                            >
                                                                <span>{lang.name}</span>
                                                                {isSelected && (
                                                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                                    </svg>
                                                                )}
                                                            </button>
                                                        );
                                                    })
                                                ) : (
                                                    <div className="w-full py-4 flex items-center justify-center gap-2 text-slate-600 text-xs">
                                                        <SpinnerIcon className="w-4 h-4 animate-spin" />
                                                        <span>Loading...</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <input
                                            type="text"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            placeholder="Phone"
                                            className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:border-blue-500/50 focus:bg-white/[0.08] focus:outline-none transition-all placeholder:text-slate-600"
                                            disabled={isLoading}
                                        />
                                        <input
                                            type="text"
                                            value={address}
                                            onChange={(e) => setAddress(e.target.value)}
                                            placeholder="Address"
                                            className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:border-blue-500/50 focus:bg-white/[0.08] focus:outline-none transition-all placeholder:text-slate-600"
                                            disabled={isLoading}
                                        />
                                    </div>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold rounded-2xl shadow-xl shadow-blue-600/20 transform hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-3 mt-4 disabled:opacity-50"
                            >
                                {isLoading ? (
                                    <SpinnerIcon className="w-5 h-5 animate-spin text-white" />
                                ) : (
                                    <>
                                        <span>{mode === 'login' ? 'Enter Platform' : 'Create Account'}</span>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                        </svg>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    <div className="p-6 bg-white/5 border-t border-white/10 text-center">
                        <p className="text-slate-500 text-xs flex items-center justify-center gap-1">
                            Secured by <span className="font-bold text-slate-400 tracking-tighter">alphaTUB Security</span>
                        </p>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    50% { transform: translateX(5px); }
                    75% { transform: translateX(-5px); }
                }
                .animate-shake { animation: shake 0.4s ease-in-out; }
                
                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-slideDown { animation: slideDown 0.3s ease-out forwards; }
            `}} />
        </div>
    );
};

export default LoginScreen;
