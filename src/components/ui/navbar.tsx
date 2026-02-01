"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { BrainCircuit, Briefcase, FileText, LayoutDashboard, Map } from "lucide-react";

export function Navbar() {
    const pathname = usePathname();

    const links = [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/learning-path", label: "My Path", icon: Map },
        { href: "/chat", label: "AI Mentor", icon: BrainCircuit },
        { href: "/career", label: "Jobs & Forecast", icon: Briefcase },
        { href: "/resume", label: "Resume", icon: FileText },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-black/80 backdrop-blur-lg md:top-0 md:bottom-auto md:border-b md:border-t-0 no-print">
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
                <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                    <BrainCircuit className="h-6 w-6 text-blue-400" />
                    <span>Navixa</span>
                </Link>

                {/* Desktop Nav */}
                <div className="hidden md:flex items-center gap-6">
                    {links.map((link) => {
                        const Icon = link.icon;
                        const isActive = pathname === link.href;
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={cn(
                                    "flex items-center gap-2 text-sm font-medium transition-colors hover:text-white",
                                    isActive ? "text-white" : "text-zinc-400"
                                )}
                            >
                                <Icon className="h-4 w-4" />
                                {link.label}
                            </Link>
                        );
                    })}
                </div>

                {/* Mobile Nav (Simple bottom bar style for now, but hidden on desktop) */}
                <div className="flex md:hidden justify-around w-full">
                    {/* Mobile view logic is handled by the container styles (fixed bottom) showing these links effectively */}
                </div>
            </div>

            {/* Mobile Bottom Bar Content */}
            <div className="flex md:hidden justify-around items-center h-full w-full py-2">
                {links.map((link) => {
                    const Icon = link.icon;
                    const isActive = pathname === link.href;
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={cn(
                                "flex flex-col items-center gap-1 text-[10px] font-medium transition-colors",
                                isActive ? "text-blue-400" : "text-zinc-500"
                            )}
                        >
                            <Icon className="h-5 w-5" />
                            <span>{link.label}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
