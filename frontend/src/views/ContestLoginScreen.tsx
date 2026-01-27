import React, { useState } from 'react';
import { authService } from '../services/authService';
import { contestService } from '../services/contestService';
import { SpinnerIcon, UserIcon } from '../components/Icons';
import { Organisation } from '../services/routingService';

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
    const [language, setLanguage] = useState('English');

    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDataAutoPopulated, setIsDataAutoPopulated] = useState(false);

    const resetRegistrationFields = () => {
        setEmail('');
        setAge('');
        setCountry('');
        setPhone('');
        setAddress('');
        setLanguage('English');
        setIsDataAutoPopulated(false);
    };

    const handleUsernameBlur = async () => {
        if (mode === 'register' && username) {
            setIsLoading(true);
            setIsDataAutoPopulated(false);
            try {
                const result = await contestService.checkParticipant(username);
                if (result.found && result.data) {
                    const data = result.data;
                    if (data.email_id) setEmail(data.email_id);
                    if (data.age) setAge(data.age.toString());
                    if (data.country) setCountry(data.country);
                    if (data.phone_number) setPhone(data.phone_number);
                    if (data.address) setAddress(data.address);
                    if (data.selected_languages && data.selected_languages.length > 0) {
                        setLanguage(data.selected_languages[0]);
                    }
                    setIsDataAutoPopulated(true);
                } else {
                    resetRegistrationFields();
                }
            } catch (error) {
                console.error("Error checking participant:", error);
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setIsLoading(true);

        try {
            if (mode === 'register') {
                await contestService.contestRegister({
                    username,
                    password,
                    contestId,
                    email,
                    age: parseInt(age),
                    country,
                    phone_number: phone,
                    address,
                    selected_languages: [language]
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
            const detail = err.response?.data?.detail;
            setError(typeof detail === 'string' ? detail : 'Authentication failed. Please check your details.');
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
                <div className="flex flex-col md:flex-row bg-white/[0.03] backdrop-blur-2xl rounded-[2.5rem] shadow-[0_0_80px_rgba(0,0,0,0.5)] border border-white/10 overflow-hidden min-h-[650px]">

                    {/* Left Brand Panel */}
                    <div className="md:w-[40%] p-12 flex flex-col justify-between bg-gradient-to-br from-blue-600/20 to-transparent border-b md:border-b-0 md:border-r border-white/10">
                        <div>
                            <div className="flex flex-col gap-6 mb-10">
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

                            <h2 className="text-4xl md:text-5xl font-black leading-tight mb-4 text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60">
                                {mode === 'login' ? 'Ready for the' : 'Join the'} <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300">Challenge?</span>
                            </h2>
                            <p className="text-slate-400 text-lg max-w-[280px]">
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
                    <div className="md:w-[60%] p-12 flex flex-col justify-center">
                        <div className="max-w-md mx-auto w-full">
                            <div className="flex items-center justify-between mb-10">
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

                            <form onSubmit={handleSubmit} className="space-y-5">
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

                                <div className="space-y-4">
                                    <div className="relative group">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors">
                                            <UserIcon className="w-5 h-5" />
                                        </div>
                                        <input
                                            type="text"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            onBlur={handleUsernameBlur}
                                            required
                                            placeholder="Username"
                                            className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl focus:border-blue-500/50 focus:bg-white/[0.08] focus:outline-none transition-all placeholder:text-slate-600"
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
                                            className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl focus:border-blue-500/50 focus:bg-white/[0.08] focus:outline-none transition-all placeholder:text-slate-600"
                                            disabled={isLoading}
                                        />
                                    </div>

                                    {mode === 'register' && (
                                        <div className="grid grid-cols-2 gap-4 animate-slideDown">
                                            <div className="relative group">
                                                <input
                                                    type="number"
                                                    value={age}
                                                    onChange={(e) => setAge(e.target.value)}
                                                    required
                                                    min="1"
                                                    placeholder="Age"
                                                    className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl focus:border-blue-500/50 focus:outline-none transition-all placeholder:text-slate-600"
                                                />
                                            </div>
                                            <div className="relative group">
                                                <input
                                                    type="text"
                                                    value={country}
                                                    onChange={(e) => setCountry(e.target.value)}
                                                    required
                                                    placeholder="Country"
                                                    className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl focus:border-blue-500/50 focus:outline-none transition-all placeholder:text-slate-600"
                                                />
                                            </div>
                                            <div className="col-span-2 space-y-4">
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
                                                        className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl focus:border-blue-500/50 focus:outline-none transition-all placeholder:text-slate-600"
                                                    />
                                                </div>
                                                <input
                                                    type="text"
                                                    value={address}
                                                    onChange={(e) => setAddress(e.target.value)}
                                                    placeholder="Address (City, State)"
                                                    className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl focus:border-blue-500/50 focus:outline-none transition-all placeholder:text-slate-600"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold rounded-2xl shadow-xl shadow-blue-600/20 transform hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {isLoading ? (
                                        <SpinnerIcon className="w-5 h-5 animate-spin text-white" />
                                    ) : (
                                        <span>{mode === 'login' ? 'Enter Contest' : 'Join Now'}</span>
                                    )}
                                    {!isLoading && (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                        </svg>
                                    )}
                                </button>
                            </form>

                            <div className="mt-8 pt-8 border-t border-white/5 text-center">
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
