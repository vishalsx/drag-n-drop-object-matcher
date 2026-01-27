import React, { useState } from 'react';
import { authService } from '../services/authService';
import { SpinnerIcon, UserIcon } from '../components/Icons';

interface LoginScreenProps {
    orgName?: string;
    param2?: string;
    param3?: string;
    onLoginSuccess: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ orgName, param2, param3, onLoginSuccess }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            await authService.login(username, password, orgName, param2, param3);
            onLoginSuccess();
        } catch (err) {
            setError('Login failed. Please check your credentials.');
        } finally {
            setIsLoading(false);
        }
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
                            <div className="w-16 h-16 bg-gradient-to-tr from-blue-500 to-teal-400 rounded-2xl flex items-center justify-center font-black text-3xl shadow-lg shadow-blue-500/20 mb-6 transition-transform hover:scale-110 cursor-default">A</div>
                            <h1 className="text-3xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60">
                                {orgName ? `${orgName} Internal Access` : 'Welcome Back'}
                            </h1>
                            <p className="text-slate-500 text-sm max-w-[280px]">
                                This is a private area. Please provide your credentials to enter the platform.
                            </p>
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-2xl text-sm font-medium mb-6 animate-shake text-center">
                                {error}
                            </div>
                        )}

                        <form className="space-y-4" onSubmit={handleLogin}>
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

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold rounded-2xl shadow-xl shadow-blue-600/20 transform hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-3 mt-4 disabled:opacity-50"
                            >
                                {isLoading ? (
                                    <SpinnerIcon className="w-5 h-5 animate-spin text-white" />
                                ) : (
                                    <>
                                        <span>Enter Platform</span>
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
            `}} />
        </div>
    );
};

export default LoginScreen;
