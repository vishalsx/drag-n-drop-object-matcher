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
    const [dob, setDob] = useState('');
    const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
    const [availableLanguages, setAvailableLanguages] = useState<Language[]>([]);
    const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);

    const [hasAttemptedAuth, setHasAttemptedAuth] = useState(false);
    const [isPersonalDetailsExpanded, setIsPersonalDetailsExpanded] = useState(false);
    const [isReadOnly, setIsReadOnly] = useState(false);
    const [isOverflowVisible, setIsOverflowVisible] = useState(false);

    React.useEffect(() => {
        let timeout: NodeJS.Timeout;
        if (isPersonalDetailsExpanded) {
            // Wait for transition (700ms) then allow overflow
            timeout = setTimeout(() => {
                setIsOverflowVisible(true);
            }, 700);
        } else {
            // Immediately hide overflow when collapsing
            setIsOverflowVisible(false);
        }
        return () => clearTimeout(timeout);
    }, [isPersonalDetailsExpanded]);

    const langDropdownRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (langDropdownRef.current && !langDropdownRef.current.contains(event.target as Node)) {
                setIsLangDropdownOpen(false);
            }
        };

        if (isLangDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isLangDropdownOpen]);

    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const resetRegistrationFields = () => {
        setEmail('');
        setAge('');
        setDob('');
        setCountry('');
        setPhone('');
        setAddress('');
        setSelectedLanguages([]);
        setHasAttemptedAuth(false);
        setIsReadOnly(false);
        setIsPersonalDetailsExpanded(false);
    };

    const calculateAge = (birthDate: string) => {
        if (!birthDate) return null;
        const today = new Date();
        const birth = new Date(birthDate);
        let calculatedAge = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
            calculatedAge--;
        }
        return calculatedAge;
    };

    React.useEffect(() => {
        resetRegistrationFields();
        setError(null);
        setSuccess(null);
    }, [mode]);

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

    const handleAuthenticateStep = (e: React.MouseEvent) => {
        e.preventDefault();
        if (!username || !password) {
            setError('Please enter username and password to continue');
            return;
        }
        setError(null);
        setHasAttemptedAuth(true);
        setIsPersonalDetailsExpanded(true);
    };

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
                    dob,
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
                    <div className="p-6"> {/* Reduced padding from p-10 to p-6 */}
                        <div className="flex flex-col items-center text-center mb-6"> {/* Reduced mb-10 to mb-6 */}
                            <a href="/" className="hover:opacity-80 transition-opacity">
                                <img
                                    src="/alphatub-logo.png"
                                    alt="playTUB"
                                    className="w-12 h-12 object-contain drop-shadow-lg mb-3 transition-transform hover:scale-110 cursor-default"
                                /> {/* Reduced size w-16 h-16 -> w-12 h-12, mb-6 -> mb-3 */}
                            </a>
                            <h1 className="text-2xl font-black mb-1 text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60">
                                {orgName ? `${orgName} Internal Access` : (mode === 'login' ? 'Welcome Back' : 'Create Account')}
                            </h1> {/* Reduced text-3xl -> text-2xl */}
                            <p className="text-slate-500 text-xs max-w-[280px]">
                                {mode === 'login' ? 'Please provide your credentials to enter the platform.' : 'Join our global community of learners.'}
                            </p>

                            {(!orgName || isPublicOrg) && (
                                <div className="mt-4 flex p-1 bg-white/5 rounded-xl border border-white/10 w-full max-w-[200px]">
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
                            <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-2 rounded-2xl text-xs font-medium mb-4 animate-shake text-center">
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 px-4 py-2 rounded-2xl text-xs font-medium mb-4 animate-slideDown text-center">
                                {success}
                            </div>
                        )}

                        <form className="space-y-3" onSubmit={handleSubmit}> {/* Reduced space-y-4 -> space-y-3 */}
                            {/* SECTION 1: Credentials */}
                            <div className={`transition-all duration-500 ease-in-out overflow-hidden ${hasAttemptedAuth ? 'max-h-12 opacity-100' : 'max-h-[300px] opacity-100'}`}>
                                {hasAttemptedAuth ? (
                                    // Compact Summary View for Step 1
                                    <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-2xl">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                                                ✓
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-xs text-slate-500">Registering as</span>
                                                <span className="text-sm font-bold text-white">{username}</span>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setHasAttemptedAuth(false);
                                                setIsPersonalDetailsExpanded(false);
                                            }}
                                            className="text-xs text-blue-400 hover:text-blue-300 font-bold px-3 py-1"
                                        >
                                            Edit
                                        </button>
                                    </div>
                                ) : (
                                    // Full Credentials Form
                                    <div className="space-y-3">
                                        <div className="relative group">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors">
                                                <UserIcon className="w-4 h-4" />
                                            </div>
                                            <input
                                                type="text"
                                                value={username}
                                                onChange={(e) => setUsername(e.target.value)}
                                                required
                                                placeholder="Username"
                                                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl focus:border-blue-500/50 focus:bg-white/[0.08] focus:outline-none transition-all placeholder:text-slate-600 text-sm"
                                                disabled={isLoading}
                                            />
                                        </div>

                                        <div className="relative group">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                                </svg>
                                            </div>
                                            <input
                                                type="password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                required
                                                placeholder="Password"
                                                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl focus:border-blue-500/50 focus:bg-white/[0.08] focus:outline-none transition-all placeholder:text-slate-600 text-sm"
                                                disabled={isLoading}
                                            />
                                        </div>

                                        {mode === 'register' && (
                                            <button
                                                onClick={handleAuthenticateStep}
                                                type="button"
                                                disabled={isLoading || !username || !password}
                                                className="w-full py-3 mt-1 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                            >
                                                {isLoading ? <SpinnerIcon className="w-4 h-4 animate-spin" /> : <span>Continue Registration</span>}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* SECTION 2: Personal Details (Collapsible) */}
                            {mode === 'register' && (
                                <div className={`transition-all duration-700 ease-in-out ${isOverflowVisible ? 'overflow-visible' : 'overflow-hidden'} border border-t-0 p-5 rounded-b-3xl bg-white/5 ${isPersonalDetailsExpanded ? 'max-h-[1000px] opacity-100 mb-4' : 'max-h-0 opacity-0 mb-0 pointer-events-none p-0 border-none'} ${hasAttemptedAuth ? 'border-blue-500/30' : 'border-white/10'}`}>
                                    <div className="flex flex-col mt-2 pt-2 border-t border-white/10">
                                        <h4 className="text-sm font-bold text-slate-400 mb-3">Personal Details</h4>
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="relative group">
                                                    <input
                                                        type="date"
                                                        value={dob}
                                                        onChange={(e) => {
                                                            const newDob = e.target.value;
                                                            setDob(newDob);
                                                            const calculated = calculateAge(newDob);
                                                            if (calculated !== null) {
                                                                setAge(calculated.toString());
                                                            }
                                                        }}
                                                        required
                                                        placeholder="DOB"
                                                        className={`w-full px-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:border-blue-500/50 focus:outline-none transition-all placeholder:text-slate-600 ${isReadOnly ? 'opacity-50 cursor-not-allowed text-slate-400' : ''}`}
                                                        disabled={isLoading || isReadOnly}
                                                    />
                                                    {dob && (
                                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
                                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Age</span>
                                                            <span className="px-2 py-0.5 bg-blue-600/20 text-blue-400 text-xs font-bold rounded-lg border border-blue-500/20">{age}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <input
                                                    type="text"
                                                    value={country}
                                                    onChange={(e) => setCountry(e.target.value)}
                                                    required
                                                    placeholder="Country"
                                                    className={`w-full px-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:border-blue-500/50 focus:outline-none transition-all placeholder:text-slate-600 ${isReadOnly ? 'opacity-50 cursor-not-allowed text-slate-400' : ''}`}
                                                    disabled={isLoading || isReadOnly}
                                                />
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="relative group">
                                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors">
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                        </svg>
                                                    </div>
                                                    <input
                                                        type="email"
                                                        value={email}
                                                        onChange={(e) => setEmail(e.target.value)}
                                                        required
                                                        placeholder="Email Address"
                                                        className={`w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:border-blue-500/50 focus:outline-none transition-all placeholder:text-slate-600 ${isReadOnly ? 'opacity-50 cursor-not-allowed text-slate-400' : ''}`}
                                                        disabled={isLoading || isReadOnly}
                                                    />
                                                </div>

                                                <div className="relative group">
                                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors">
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                        </svg>
                                                    </div>
                                                    <input
                                                        type="tel"
                                                        value={phone}
                                                        onChange={(e) => setPhone(e.target.value)}
                                                        required
                                                        placeholder="Phone Number"
                                                        className={`w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:border-blue-500/50 focus:outline-none transition-all placeholder:text-slate-600 ${isReadOnly ? 'opacity-50 cursor-not-allowed text-slate-400' : ''}`}
                                                        disabled={isLoading || isReadOnly}
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3 pb-2"> {/* Added padding bottom to accommodate dropdown if needed, though absolute positioning handles it */}
                                                {/* Language Selection Compact */}
                                                <div className="relative" ref={langDropdownRef}>
                                                    <button
                                                        type="button"
                                                        disabled={isReadOnly}
                                                        onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                                                        className={`w-full px-3 py-3 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between group hover:bg-white/[0.08] transition-all ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    >
                                                        <div className="flex flex-wrap gap-1 overflow-hidden h-5 items-center">
                                                            {selectedLanguages.length > 0 ? (
                                                                <span className="text-xs text-blue-400 font-bold">{selectedLanguages.length} Langs Selected</span>
                                                            ) : (
                                                                <span className="text-xs text-slate-600">Languages</span>
                                                            )}
                                                        </div>
                                                        <svg className={`w-3 h-3 text-slate-500 transition-transform duration-300 ${isLangDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    </button>

                                                    {/* Dropdown Overlay - Now Opens DOWNWARDS (top-full) */}
                                                    {isLangDropdownOpen && (
                                                        <div className="absolute top-full left-0 w-full mt-1 bg-[#1a1c20] border border-white/20 rounded-2xl shadow-xl z-[60] p-2 max-h-32 overflow-y-auto custom-scrollbar">
                                                            {availableLanguages.map((lang) => {
                                                                const isSelected = selectedLanguages.includes(lang.name);
                                                                const isMaxReached = selectedLanguages.length >= 3 && !isSelected;
                                                                return (
                                                                    <button
                                                                        key={lang.code}
                                                                        type="button"
                                                                        disabled={isMaxReached}
                                                                        onClick={() => toggleLanguage(lang.name)}
                                                                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold mb-1 ${isSelected ? 'bg-blue-600/20 text-blue-400' : isMaxReached ? 'opacity-40' : 'hover:bg-white/10 text-slate-300'}`}
                                                                    >
                                                                        <span>{lang.name}</span>
                                                                        {isSelected && <span className="text-blue-400">✓</span>}
                                                                    </button>
                                                                )
                                                            })}
                                                        </div>
                                                    )}
                                                </div>

                                                <input
                                                    type="text"
                                                    value={address}
                                                    onChange={(e) => setAddress(e.target.value)}
                                                    placeholder="City, State"
                                                    className={`w-full px-3 py-3 bg-white/5 border border-white/10 rounded-2xl focus:border-blue-500/50 focus:outline-none transition-all placeholder:text-slate-600 text-sm ${isReadOnly ? 'opacity-50 cursor-not-allowed text-slate-400' : ''}`}
                                                    disabled={isLoading || isReadOnly}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {(mode === 'login' || hasAttemptedAuth) && (
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold rounded-2xl shadow-xl shadow-blue-600/20 transform hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-3 mt-4 disabled:opacity-50 text-sm"
                                >
                                    {isLoading ? (
                                        <SpinnerIcon className="w-5 h-5 animate-spin text-white" />
                                    ) : (
                                        <>
                                            <span>{mode === 'login' ? 'Enter Platform' : 'Create Account'}</span>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                            </svg>
                                        </>
                                    )}
                                </button>
                            )}
                        </form>
                    </div>

                    <div className="p-6 bg-white/5 border-t border-white/10 text-center">
                        <p className="text-slate-500 text-xs flex items-center justify-center gap-1">
                            Secured by <span className="font-bold text-slate-400 tracking-tighter">playTUB Security</span>
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
