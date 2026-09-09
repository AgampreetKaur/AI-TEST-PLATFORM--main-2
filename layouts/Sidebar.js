function Sidebar({ currentPath, isOpen, onClose }) {
    // Defensive: a malformed/leftover value in localStorage could make
    // API.auth.getUser() throw, which would otherwise crash every page
    // (Sidebar renders on all of them) before anything else even loads.
    const getSafeUser = () => {
        try {
            return (typeof API !== 'undefined' && API.auth.getUser()) || null;
        } catch (e) {
            console.warn("Ignoring unreadable stored user data:", e);
            return null;
        }
    };
    const currentUser = getSafeUser();
    const navItems = [
        { name: 'Dashboard', icon: 'layout-dashboard', path: 'index.html' },
        { name: 'Chapters', icon: 'book-open', path: 'chapters.html' },
        { name: 'Test Generator', icon: 'file-text', path: 'generator.html' },
        { name: 'My Tests', icon: 'calendar-clock', path: 'tests.html' },
        { name: 'Homework Validation', icon: 'clipboard-check', path: 'validation.html' },
        { name: 'Reports & Analytics', icon: 'chart-bar', path: 'reports.html' },
        { name: 'AI Tutor', icon: 'bot', path: 'chatbot.html' },
        { name: 'Settings', icon: 'settings', path: 'settings.html' },
    ];

    const handleNavigation = (path) => {
        // If we are already on the target path's pseudo-equivalent, do nothing
        const currentPathName = window.location.pathname.split('/').pop() || 'index.html';
        if (currentPathName === path) return;
        window.location.href = path;
    };

    const isActive = (path) => {
        const currentPathName = window.location.pathname.split('/').pop() || 'index.html';
        return currentPathName === path;
    };

    return (
        <React.Fragment>

            {/* Backdrop — mobile only, tapping it closes the drawer. On
                md+ screens the sidebar is always visible and this never
                renders, since isOpen only matters below md. */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/40 z-30 md:hidden"
                    onClick={onClose}
                    aria-hidden="true"
                ></div>
            )}

            <aside
                className={`w-64 bg-white border-r border-[var(--border-color)] h-screen fixed left-0 top-0 flex flex-col z-40 transition-transform duration-200 ease-in-out
                    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                    md:translate-x-0`}
                data-name="sidebar"
                data-file="layouts/Sidebar.js"
            >
                <div className="h-16 flex items-center justify-between px-6 border-b border-[var(--border-color)] bg-[var(--primary)] text-white">
                    <div className="flex items-center">
                        <div className="icon-graduation-cap text-white text-2xl mr-3"></div>
                        <h1 className="font-bold text-lg tracking-tight">AI Assessment System</h1>
                    </div>
                    {/* Close button — mobile only */}
                    <button
                        className="md:hidden text-white/80 hover:text-white p-1"
                        onClick={onClose}
                        aria-label="Close menu"
                    >
                        <div className="icon-x text-xl"></div>
                    </button>
                </div>
                
                <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                    {navItems.map((item) => (
                        <button
                            key={item.name}
                            onClick={() => { handleNavigation(item.path); if (onClose) onClose(); }}
                            className={`w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                isActive(item.path)
                                    ? 'bg-indigo-50 text-[var(--primary)]'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                        >
                            <div className={`icon-${item.icon} text-lg mr-3 ${isActive(item.path) ? 'text-[var(--primary)]' : 'text-gray-400'}`}></div>
                            {item.name}
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-[var(--border-color)]">
                    <div className="flex items-center gap-3 mb-3">
                        <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
                            (currentUser && currentUser.Name) || 'Student'
                        )}&background=4f46e5&color=fff`} alt="User" className="w-9 h-9 rounded-full" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                                {(currentUser && currentUser.Name) || 'Student'}
                            </p>
                            <p className="text-xs text-gray-500 truncate">Student</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => { if(typeof API !== 'undefined') API.auth.logout(); }}
                        className="w-full flex items-center justify-center gap-2 text-sm text-red-600 hover:bg-red-50 py-2 rounded-lg transition-colors"
                    >
                        <div className="icon-log-out"></div> Logout
                    </button>
                </div>
            </aside>

        </React.Fragment>
    );
}