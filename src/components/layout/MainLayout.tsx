import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useEmpresa } from '../../contexts/EmpresaContext';

/** Layout principal com sidebar fixa e conteúdo scrollável */
export default function MainLayout() {
    const { loading } = useEmpresa();

    if (loading) {
        return (
            <div className="min-h-screen bg-dark-950 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-axen-500/30 border-t-axen-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-dark-950">
            <Sidebar />
            <div className="flex-1 ml-64 flex flex-col">
                <Header />
                <main className="flex-1 p-6 overflow-y-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
