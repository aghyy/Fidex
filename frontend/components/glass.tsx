"use client";

export default function GlassCard() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-700">
            <div className="relative p-8 rounded-3xl backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl">
                <h1 className="text-3xl text-white font-semibold mb-4">Liquid Glass UI</h1>
                <p className="text-slate-200">
                    Dieses Panel nutzt transparente Ebenen und Blur für einen Glas-Effekt.
                </p>
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/30 to-transparent opacity-20 pointer-events-none" />
            </div>
        </div>
    );
}
