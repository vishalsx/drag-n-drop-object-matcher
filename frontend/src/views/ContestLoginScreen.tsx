import React, { useState } from 'react';
import { authService } from '../services/authService';
import { contestService } from '../services/contestService';
import { SpinnerIcon, UserIcon } from '../components/Icons';
import { Organisation } from '../services/routingService';
import { fetchActiveLanguages } from '../services/gameService';
import { Language } from '../types/types';

interface ContestLoginScreenProps {
    contestName?: string;
    contestId: string;
    onLoginSuccess: () => void;
    orgCode?: string;
    orgData?: Organisation | null;
}

const ContestLoginScreen: React.FC<ContestLoginScreenProps> = ({ contestName, contestId, onLoginSuccess, orgCode, orgData }) => {
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

    const [isAuthenticatedForReg, setIsAuthenticatedForReg] = useState(false);
    const [hasAttemptedAuth, setHasAttemptedAuth] = useState(false);
    const [isReadOnly, setIsReadOnly] = useState(false);

    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDataAutoPopulated, setIsDataAutoPopulated] = useState(false);
    const [isPersonalDetailsExpanded, setIsPersonalDetailsExpanded] = useState(false);

    const resetRegistrationFields = () => {
        setEmail('');
        setAge('');
        setCountry('');
        setPhone('');
        setAddress('');
        setSelectedLanguages([]);
        setIsDataAutoPopulated(false);
        setIsAuthenticatedForReg(false);
        setHasAttemptedAuth(false);
        setIsReadOnly(false);
        setIsPersonalDetailsExpanded(false);
    };

    React.useEffect(() => {
        resetRegistrationFields();
        setError(null);
        setSuccess(null);
    }, [mode]);

    React.useEffect(() => {
        const loadLanguages = async () => {
            try {
                // Fetch ALL public languages (without orgId to get metadata like codes/bcp47)
                const langs = await fetchActiveLanguages();

                // Filter by org's allowed languages if available
                if (orgData?.languages_allowed && orgData.languages_allowed.length > 0) {
                    const filtered = langs.filter(lang =>
                        orgData.languages_allowed!.includes(lang.name) ||
                        lang.name.toLowerCase() === 'english' // Always allow English as it's the base
                    );

                    // Sort to ensure English is first if present
                    const finalLangs = filtered.sort((a, b) => {
                        if (a.name.toLowerCase() === 'english') return -1;
                        if (b.name.toLowerCase() === 'english') return 1;
                        return a.name.localeCompare(b.name);
                    });

                    console.log("[ContestLogin] filtered languages:", finalLangs.map(l => l.name));
                    setAvailableLanguages(finalLangs);
                } else {
                    // Fallback to English only if no org settings found, or keep all if public
                    const englishOnly = langs.filter(l => l.name.toLowerCase() === 'english');
                    setAvailableLanguages(englishOnly.length > 0 ? englishOnly : langs);
                }
            } catch (error) {
                console.error('Failed to load languages:', error);
            }
        };
        loadLanguages();
    }, [orgData]);

    const toggleLanguage = (langName: string) => {
        setSelectedLanguages(prev => {
            if (prev.includes(langName)) {
                return prev.filter(l => l !== langName);
            }
            if (prev.length >= 3) return prev;
            return [...prev, langName];
        });
    };

    const handleAuthenticate = async (e: React.MouseEvent) => {
        e.preventDefault();

        if (!username || !password) {
            setError('Please enter username and password to authenticate');
            return;
        }

        setIsLoading(true);
        setError(null);
        setSuccess(null); // Clear previous success messages

        try {
            const result = await contestService.authenticateParticipant(username, password);

            if (result.found && result.data) {
                const data = result.data;
                // Populate data
                if (data.email_id) setEmail(data.email_id);
                if (data.age) setAge(data.age.toString());
                if (data.country) setCountry(data.country);
                if (data.phone_number) setPhone(data.phone_number); // Changed from setPhoneNumber to setPhone
                if (data.address) setAddress(data.address);
                if (data.selected_languages && data.selected_languages.length > 0) {
                    setSelectedLanguages(data.selected_languages);
                }

                // Disable field updates for existing participants
                setIsReadOnly(true);

                setIsDataAutoPopulated(true);
                setIsAuthenticatedForReg(true);
                setHasAttemptedAuth(true); // Mark that authentication was attempted
                setIsPersonalDetailsExpanded(true); // Auto-expand on success
                setSuccess('Authentication successful. Please verify details and join.');
            } else {
                // Auth Failed -> New User Flow
                resetRegistrationFields(); // Clear fields first
                setHasAttemptedAuth(true); // THEN mark as attempted
                setIsPersonalDetailsExpanded(true); // Auto-expand for new users
                setIsAuthenticatedForReg(false);
                setIsReadOnly(false);
                setSuccess('Please fill in your details below to register for the contest.');
            }
        } catch (err: any) {
            console.error(err);
            if (err.response && err.response.status === 401) {
                // Incorrect Password: Do NOT switch to New User flow
                setError('Incorrect password. Please verify your credentials.');
                // Keep hasAttemptedAuth = false so button remains "Authenticate"
            } else {
                // Other errors (Network, 503, etc.) - Fallback or Error?
                // If service is down, maybe allow manual entry? Or show error?
                // The implementation plan says: "If API returns found: False: Proceed to New User".
                // So exceptions here are unexpected.
                setError('Authentication service error. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleUsernameChange = (newUsername: string) => {
        setUsername(newUsername);
        // Reset auth state if username changes after an attempt
        if (hasAttemptedAuth) {
            setIsAuthenticatedForReg(false);
            setHasAttemptedAuth(false);
            setIsDataAutoPopulated(false);
            setIsReadOnly(false);
            setError(null);
            setSuccess(null);
            resetRegistrationFields();
            setIsPersonalDetailsExpanded(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setIsLoading(true);

        try {
            if (mode === 'register') {
                // Step 2: Register

                // Step 2: Register
                await contestService.contestRegister({
                    username,
                    password,
                    contestId,
                    email,
                    age: parseInt(age),
                    country,
                    phone_number: phone,
                    address,
                    selected_languages: selectedLanguages.length > 0 ? selectedLanguages : ['English']
                });
                setSuccess('Registration successful! You can now log in.');
                setMode('login');
                setPassword('');
                resetRegistrationFields();
            } else {
                await contestService.contestLogin(username, password, contestId);
                const contestError = authService.getContestError();
                if (contestError) {
                    setError(contestError);
                    authService.logout();
                } else {
                    onLoginSuccess();
                }
            }
        } catch (err: any) {
            console.error("Login Error:", err);
            const detail = err.response?.data?.detail;

            if (detail && detail.includes("disqualified")) {
                setError("You have been disqualified from this contest due to excessive incomplete attempts.");
            } else if (detail) {
                setError(typeof detail === 'string' ? detail : 'Authentication failed.');
            } else {
                setError('Authentication failed. Please check your details.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0c] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
            {/* Animated Mesh Gradient Background */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-teal-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
                <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-purple-600/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '4s' }}></div>
            </div>

            <div className="z-10 w-full max-w-5xl">
                <div className="flex flex-col md:flex-row bg-white/[0.03] backdrop-blur-2xl rounded-[2.5rem] shadow-[0_0_80px_rgba(0,0,0,0.5)] border border-white/10 overflow-hidden min-h-[600px]">

                    {/* Left Brand Panel */}
                    <div className="md:w-[40%] p-8 flex flex-col justify-between bg-gradient-to-br from-blue-600/20 to-transparent border-b md:border-b-0 md:border-r border-white/10">
                        <div>
                            <div className="flex flex-col gap-6 mb-6">
                                {/* alphaTUB Branding (Icon + Text) */}
                                <div className="flex items-center gap-3">
                                    <img
                                        src="/alphatub-logo.png"
                                        alt="alphaTUB"
                                        className="w-10 h-10 object-contain drop-shadow-lg"
                                    />
                                    <span className="text-2xl font-black tracking-tighter text-white">alphaTUB</span>
                                </div>

                                {/* Divider with Org Logo */}
                                <div className="flex items-center gap-4">
                                    <div className="h-px bg-white/10 flex-1"></div>
                                    {orgData?.logo_url ? (
                                        <img
                                            src={orgData.logo_url}
                                            alt={orgData.org_name}
                                            className="h-10 object-contain drop-shadow-xl"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 bg-gradient-to-tr from-blue-500 to-teal-400 rounded-xl flex items-center justify-center font-black text-xl shadow-lg shadow-blue-500/20">
                                            {orgData?.org_name ? orgData.org_name[0] : 'A'}
                                        </div>
                                    )}
                                    <div className="h-px bg-white/10 flex-1"></div>
                                </div>

                                {orgData?.org_name && (
                                    <div className="text-center">
                                        <span className="text-xs font-black uppercase tracking-widest text-blue-400/80">Affiliated with</span>
                                        <h4 className="text-lg font-bold text-white tracking-tight">{orgData.org_name}</h4>
                                    </div>
                                )}
                            </div>

                            <h2 className="text-3xl md:text-4xl font-black leading-tight mb-3 text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60">
                                {mode === 'login' ? 'Ready for the' : 'Join the'} <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300">Challenge?</span>
                            </h2>
                            <p className="text-slate-400 text-base max-w-[280px]">
                                {contestName || 'Compete with others and show your skills in this global contest.'}
                            </p>
                        </div>

                        <div className="flex flex-col gap-4">
                            <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-center">
                                <p className="text-sm text-slate-400 italic">"Join the community of learners and competitors."</p>
                            </div>
                            <p className="text-slate-500 text-xs">© 2026 alphaTUB. All rights reserved.</p>
                        </div>
                    </div>

                    {/* Right Form Panel */}
                    <div className="md:w-[60%] p-8 flex flex-col justify-center">
                        <div className="max-w-md mx-auto w-full">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-2xl font-bold mb-1">{mode === 'login' ? 'Welcome Back' : 'Get Started'}</h3>
                                    <p className="text-slate-500 text-sm">Please enter your details to {mode === 'login' ? 'enter contest' : 'register'}.</p>
                                </div>
                                <div className="hidden sm:flex p-1 bg-white/5 rounded-xl border border-white/10">
                                    <button
                                        onClick={() => setMode('login')}
                                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${mode === 'login' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                                    >
                                        Login
                                    </button>
                                    <button
                                        onClick={() => setMode('register')}
                                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${mode === 'register' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                                    >
                                        Join
                                    </button>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                {error && (
                                    <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-2xl text-sm font-medium animate-shake">
                                        {error}
                                    </div>
                                )}
                                {success && (
                                    <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 px-4 py-3 rounded-2xl text-sm font-medium">
                                        {success}
                                    </div>
                                )}

                                <div className="flex flex-col">
                                    {/* SECTION 1: Authentication */}
                                    <div className={`p-5 rounded-3xl border transition-all duration-500 ${!hasAttemptedAuth ? 'bg-white/5 border-blue-500/30' : 'bg-white/[0.02] border-white/5 opacity-80'}`}>
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${!hasAttemptedAuth ? 'bg-blue-600 text-white' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'}`}>
                                                {hasAttemptedAuth ? '✓' : '1'}
                                            </div>
                                            <h4 className="text-lg font-bold text-white">Authentication</h4>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="relative group">
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors">
                                                    <UserIcon className="w-5 h-5" />
                                                </div>
                                                <input
                                                    type="text"
                                                    value={username}
                                                    onChange={(e) => handleUsernameChange(e.target.value)}
                                                    required
                                                    placeholder="Username"
                                                    className="w-full pl-12 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-2xl focus:border-blue-500/50 focus:bg-white/[0.08] focus:outline-none transition-all placeholder:text-slate-600"
                                                    disabled={isLoading}
                                                />
                                                {mode === 'register' && isDataAutoPopulated && (
                                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-400">
                                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                        </svg>
                                                    </div>
                                                )}
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
                                                    className="w-full pl-12 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-2xl focus:border-blue-500/50 focus:bg-white/[0.08] focus:outline-none transition-all placeholder:text-slate-600"
                                                    disabled={isLoading}
                                                />
                                            </div>

                                            {mode === 'register' && !hasAttemptedAuth && (
                                                <button
                                                    onClick={handleAuthenticate}
                                                    type="button"
                                                    disabled={isLoading || !username || !password}
                                                    className="w-full py-2.5 mt-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {isLoading ? <SpinnerIcon className="w-5 h-5 animate-spin" /> : <span>Authenticate User</span>}
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* SECTION 2: Personal Details (Collapsible) */}
                                    {mode === 'register' && (
                                        <div className="flex flex-col mt-4">
                                            {/* Persistent Header */}
                                            <button
                                                type="button"
                                                onClick={() => setIsPersonalDetailsExpanded(!isPersonalDetailsExpanded)}
                                                className={`w-full p-5 rounded-3xl border transition-all duration-500 bg-white/5 flex items-center justify-between group ${hasAttemptedAuth ? 'border-blue-500/30' : 'border-white/10 opacity-60 hover:opacity-100 hover:bg-white/[0.08]'} ${isPersonalDetailsExpanded ? 'rounded-b-none border-b-0' : ''}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${hasAttemptedAuth ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'bg-white/10 text-slate-500 border border-white/5'}`}>
                                                        2
                                                    </div>
                                                    <div className="text-left">
                                                        <h4 className="text-lg font-bold text-white">Personal Details</h4>
                                                        {!hasAttemptedAuth && !isPersonalDetailsExpanded && <p className="text-[10px] text-slate-500 font-medium mt-0.5">Will expand after authentication (or click to open)</p>}
                                                    </div>
                                                </div>
                                                <div className={`p-1.5 rounded-full bg-white/5 text-slate-500 group-hover:text-blue-400 transition-all duration-300 ${isPersonalDetailsExpanded ? 'rotate-180' : ''}`}>
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </div>
                                            </button>

                                            {/* Collapsible Content */}
                                            <div className={`transition-all duration-700 ease-in-out overflow-hidden border border-t-0 p-5 rounded-b-3xl bg-white/5 ${isPersonalDetailsExpanded ? 'max-h-[1000px] opacity-100 mb-4' : 'max-h-0 opacity-0 mb-0 pointer-events-none p-0 border-none'} ${hasAttemptedAuth ? 'border-blue-500/30' : 'border-white/10'}`}>
                                                <div className="space-y-4">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <input
                                                            type="number"
                                                            value={age}
                                                            onChange={(e) => setAge(e.target.value)}
                                                            required
                                                            min="1"
                                                            placeholder="Age"
                                                            className={`w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-2xl focus:border-blue-500/50 focus:outline-none transition-all placeholder:text-slate-600`}
                                                            disabled={isLoading}
                                                        />
                                                        <input
                                                            type="text"
                                                            value={country}
                                                            onChange={(e) => setCountry(e.target.value)}
                                                            required
                                                            placeholder="Country"
                                                            className={`w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-2xl focus:border-blue-500/50 focus:outline-none transition-all placeholder:text-slate-600 ${isReadOnly ? 'opacity-50 cursor-not-allowed text-slate-400' : ''}`}
                                                            disabled={isLoading || isReadOnly}
                                                        />
                                                    </div>

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
                                                            className={`w-full pl-12 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-2xl focus:border-blue-500/50 focus:outline-none transition-all placeholder:text-slate-600`}
                                                            disabled={isLoading}
                                                        />
                                                    </div>

                                                    {/* Language Selection */}
                                                    <div className="space-y-3 pt-2">
                                                        <div className="flex items-center justify-between px-1">
                                                            <label className="text-sm font-bold text-slate-400">Preferred Languages (Max 3)</label>
                                                            <span className="text-xs font-medium text-blue-400">{selectedLanguages.length}/3</span>
                                                        </div>

                                                        <button
                                                            type="button"
                                                            disabled={isReadOnly}
                                                            onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                                                            className={`w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between group hover:bg-white/[0.08] transition-all ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                        >
                                                            <div className="flex flex-wrap gap-1.5 overflow-hidden">
                                                                {selectedLanguages.length > 0 ? (
                                                                    selectedLanguages.map((lang) => (
                                                                        <span key={lang} className="px-2 py-0.5 bg-blue-600/20 text-blue-400 text-[10px] font-bold rounded-lg border border-blue-500/20">{lang}</span>
                                                                    ))
                                                                ) : (
                                                                    <span className="text-slate-600">Select Languages</span>
                                                                )}
                                                            </div>
                                                            <svg className={`w-4 h-4 text-slate-500 transition-transform duration-300 ${isLangDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                                            </svg>
                                                        </button>

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
                                                                                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${isSelected ? 'bg-blue-600/10 text-blue-400' : isMaxReached ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white/10 text-slate-400 hover:text-slate-200'}`}
                                                                            >
                                                                                <span>{lang.name}</span>
                                                                                {isSelected && <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                                                                            </button>
                                                                        );
                                                                    })
                                                                ) : (
                                                                    <div className="w-full py-4 flex items-center justify-center gap-2 text-slate-600 text-xs text-center"><SpinnerIcon className="w-4 h-4 animate-spin" /><span>Loading...</span></div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <input
                                                        type="text"
                                                        value={address}
                                                        onChange={(e) => setAddress(e.target.value)}
                                                        placeholder="Address (City, State)"
                                                        className={`w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-2xl focus:border-blue-500/50 focus:outline-none transition-all placeholder:text-slate-600`}
                                                        disabled={isLoading}
                                                    />

                                                    <button
                                                        type="submit"
                                                        disabled={isLoading || !hasAttemptedAuth}
                                                        className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold rounded-2xl shadow-xl shadow-blue-600/20 transform hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                                    >
                                                        {isLoading ? (
                                                            <SpinnerIcon className="w-5 h-5 animate-spin text-white" />
                                                        ) : (
                                                            <span>{isAuthenticatedForReg ? 'Join Now' : 'Join'}</span>
                                                        )}
                                                        {!isLoading && (
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                                            </svg>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Main Login Action (When not in register mode) */}
                                    {mode === 'login' && (
                                        <button
                                            type="submit"
                                            disabled={isLoading}
                                            className="w-full py-3 mt-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold rounded-2xl shadow-xl shadow-blue-600/20 transform hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-3"
                                        >
                                            {isLoading ? (
                                                <SpinnerIcon className="w-5 h-5 animate-spin text-white" />
                                            ) : (
                                                <span>Enter Contest</span>
                                            )}
                                            {!isLoading && (
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                                </svg>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </form>

                            <div className="mt-6 pt-6 border-t border-white/5 text-center">
                                <p className="text-slate-500 text-sm">
                                    {mode === 'login' ? "Don't have an account?" : "Already registered?"}{' '}
                                    <button
                                        onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                                        className="text-blue-400 font-bold hover:text-blue-300 transition-colors"
                                    >
                                        {mode === 'login' ? 'Sign up' : 'Sign in'}
                                    </button>
                                </p>
                            </div>
                        </div>
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

export default ContestLoginScreen;
