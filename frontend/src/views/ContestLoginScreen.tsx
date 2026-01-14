import React, { useState } from 'react';
import { authService } from '../services/authService';
import { contestService } from '../services/contestService';
import { SpinnerIcon } from '../components/Icons';

interface ContestLoginScreenProps {
    contestName?: string;
    contestId: string;
    onLoginSuccess: () => void;
    orgCode?: string;
}

const ContestLoginScreen: React.FC<ContestLoginScreenProps> = ({ contestName, contestId, onLoginSuccess, orgCode }) => {
    const [mode, setMode] = useState<'login' | 'register'>('login');
    // userType removed as per requirement
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState('');
    const [age, setAge] = useState('');
    const [country, setCountry] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [language, setLanguage] = useState('English'); // Default or dynamic?

    const [inputOrgCode, setInputOrgCode] = useState(orgCode || '');
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
            setIsDataAutoPopulated(false); // Reset indicator
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
                    setIsDataAutoPopulated(true); // Indicate data was loaded
                } else {
                    // Clear fields if no data found (new user)
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
                setPassword(''); // Clear password for security
                resetRegistrationFields(); // Clear all registration fields
            } else {
                await contestService.contestLogin(username, password, contestId);

                // Check if there was a contest validation error (e.g. invalid dates, not active)
                // even if authentication was successful.
                const contestError = authService.getContestError();
                if (contestError) {
                    setError(contestError);
                    // Clear auth state immediately to preventing entering invalid state
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
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col items-center justify-center p-4">
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-4xl border border-slate-700/50 relative overflow-hidden flex flex-col md:flex-row">
                {/* Decoration Top (Mobile) / Left (Desktop) */}
                <div className="absolute top-0 left-0 w-full h-1 md:w-1 md:h-full bg-gradient-to-r md:bg-gradient-to-b from-blue-500 via-teal-400 to-emerald-500 z-10"></div>

                {/* Left Panel: Branding & Controls */}
                <div className="md:w-5/12 p-8 flex flex-col justify-center border-b md:border-b-0 md:border-r border-slate-700/50 bg-slate-900/30">
                    <h1 className="text-3xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-400">
                        Contest Entry
                    </h1>
                    <p className="text-slate-400 mb-8 font-medium">
                        {contestName || 'Join the competition'}
                    </p>

                    {/* Mode Tabs */}
                    <div className="flex bg-slate-900/50 p-1 rounded-xl mb-6 border border-slate-700/50">
                        <button
                            onClick={() => { setMode('login'); setError(null); setSuccess(null); }}
                            type="button"
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${mode === 'login' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            Log In
                        </button>
                        <button
                            onClick={() => {
                                setMode('register');
                                setError(null);
                                setSuccess(null);
                                resetRegistrationFields(); // Clear previous data
                            }}
                            type="button"
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${mode === 'register' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            Register
                        </button>
                    </div>

                    {/* Feedback Messages in Left Panel */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-xl text-sm text-center animate-shake">
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="bg-emerald-500/10 border border-emerald-500/50 text-emerald-500 px-4 py-3 rounded-xl text-sm text-center">
                            {success}
                        </div>
                    )}
                </div>

                {/* Right Panel: Form */}
                <div className="md:w-7/12 p-8">
                    <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleSubmit}>

                        <div className="col-span-1">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Username</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                onBlur={handleUsernameBlur}
                                required
                                className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-white placeholder-slate-700"
                                placeholder="Username"
                                disabled={isLoading}
                            />
                            {mode === 'register' && isDataAutoPopulated && (
                                <p className="text-xs text-emerald-400 mt-1 ml-1 flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    Profile data loaded
                                </p>
                            )}
                        </div>

                        <div className="col-span-1">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-white placeholder-slate-700"
                                placeholder="••••••••"
                                disabled={isLoading}
                            />
                        </div>

                        {mode === 'register' && (
                            <>
                                <div className="col-span-1 animate-slideDown">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Age</label>
                                    <input
                                        type="number"
                                        value={age}
                                        onChange={(e) => setAge(e.target.value)}
                                        required
                                        min="1"
                                        max="120"
                                        className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-white placeholder-slate-700"
                                        placeholder="Age"
                                        disabled={isLoading}
                                    />
                                </div>
                                <div className="col-span-1 animate-slideDown">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Country</label>
                                    <input
                                        type="text"
                                        value={country}
                                        onChange={(e) => setCountry(e.target.value)}
                                        required
                                        className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-white placeholder-slate-700"
                                        placeholder="Country"
                                        disabled={isLoading}
                                    />
                                </div>

                                <div className="col-span-1 animate-slideDown">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Phone</label>
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-white placeholder-slate-700"
                                        placeholder="Optional"
                                        disabled={isLoading}
                                    />
                                </div>

                                <div className="col-span-1 animate-slideDown">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Language</label>
                                    <input
                                        type="text"
                                        value={language}
                                        onChange={(e) => setLanguage(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-white placeholder-slate-700"
                                        placeholder="Language"
                                        disabled={isLoading}
                                    />
                                </div>

                                <div className="col-span-1 md:col-span-2 animate-slideDown">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Email</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-white placeholder-slate-700"
                                        placeholder="For rewards"
                                        disabled={isLoading}
                                    />
                                </div>
                                <div className="col-span-1 md:col-span-2 animate-slideDown">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Address</label>
                                    <input
                                        type="text"
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-white placeholder-slate-700"
                                        placeholder="City, State (Optional)"
                                        disabled={isLoading}
                                    />
                                </div>
                            </>
                        )}

                        <div className="col-span-1 md:col-span-2 mt-4">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-black py-3 rounded-xl shadow-xl shadow-blue-500/20 transition-all transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                            >
                                {isLoading ? (
                                    <>
                                        <SpinnerIcon className="w-5 h-5 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    mode === 'login' ? 'Enter Contest' : 'Create Account'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <p className="mt-8 text-slate-500 text-sm">
                Powered by <span className="text-slate-400 font-bold">alphaTUB</span>
            </p>
        </div>
    );
};

export default ContestLoginScreen;
