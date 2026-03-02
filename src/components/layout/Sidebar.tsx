import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    LayoutDashboard,
    DollarSign,
    Target,
    KanbanSquare,
    Users,
    UserCircle,
    Zap,
} from 'lucide-react';

const NAV_ITEMS = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/financeiro', icon: DollarSign, label: 'Financeiro' },
    { to: '/metas', icon: Target, label: 'Metas' },
    { to: '/atividades', icon: KanbanSquare, label: 'Atividades' },
    { to: '/clientes', icon: Users, label: 'Clientes' },
    { to: '/membros', icon: UserCircle, label: 'Membros' },
];

/** Sidebar de navegação lateral com efeito glass */
export default function Sidebar() {
    return (
        <aside className="fixed left-0 top-0 h-screen w-64 glass border-r border-white/5 z-40 flex flex-col">
            {/* Logo */}
            <div className="px-6 py-5 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-axen-500 to-axen-700 flex items-center justify-center glow-blue">
                        <Zap className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-white tracking-tight">
                            Axen <span className="text-axen-400">Hub</span>
                        </h1>
                        <p className="text-[10px] text-dark-200 uppercase tracking-widest">
                            Gestão Empresarial
                        </p>
                    </div>
                </div>
            </div>

            {/* Navegação */}
            <nav className="flex-1 px-3 py-4 space-y-1">
                {NAV_ITEMS.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.to === '/'}
                        className={({ isActive }) =>
                            `group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
                                ? 'bg-axen-500/15 text-axen-400 border border-axen-500/20'
                                : 'text-dark-100 hover:text-white hover:bg-dark-700/50'
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <item.icon
                                    className={`w-[18px] h-[18px] transition-colors ${isActive ? 'text-axen-400' : 'text-dark-300 group-hover:text-dark-100'
                                        }`}
                                />
                                <span>{item.label}</span>
                                {isActive && (
                                    <motion.div
                                        layoutId="nav-indicator"
                                        className="ml-auto w-1.5 h-1.5 rounded-full bg-axen-400"
                                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                    />
                                )}
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* Rodapé */}
            <div className="px-4 py-4 border-t border-white/5">
                <p className="text-[10px] text-dark-300 text-center">
                    Axen Hub v1.0 · 2026
                </p>
            </div>
        </aside>
    );
}
