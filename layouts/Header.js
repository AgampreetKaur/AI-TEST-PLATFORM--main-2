function Header({ title, onMenuClick }) {
    const [notifOpen, setNotifOpen] = React.useState(false);
    const [hasUnread, setHasUnread] = React.useState(true);
    const notifRef = React.useRef(null);

    // Placeholder notification list — swap for a real GET /notifications
    // call once the backend has an endpoint for it.
    const notifications = [
        { id: 1, text: "Your Physics — Energy homework has been graded.", time: "2h ago", icon: "clipboard-check", color: "text-emerald-600 bg-emerald-50" },
        { id: 2, text: "New topic detected as a weak area: Thermodynamics.", time: "1d ago", icon: "triangle-alert", color: "text-orange-600 bg-orange-50" },
        { id: 3, text: "A new chapter was added by your teacher.", time: "3d ago", icon: "book-open", color: "text-blue-600 bg-blue-50" },
    ];

    const toggleNotif = () => {
        setNotifOpen((open) => !open);
        setHasUnread(false); // opening the panel marks everything as read
    };

    // close the dropdown when clicking anywhere outside it
    React.useEffect(() => {
        const onClickOutside = (e) => {
            if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
        };
        document.addEventListener("mousedown", onClickOutside);
        return () => document.removeEventListener("mousedown", onClickOutside);
    }, []);

    return (
        <header className="h-16 bg-white border-b border-[var(--border-color)] flex items-center justify-between px-4 md:px-8 sticky top-0 z-10" data-name="header" data-file="layouts/Header.js">
            <div className="flex items-center gap-3 min-w-0">
                {/* Hamburger — mobile only, opens the off-canvas sidebar */}
                <button
                    className="md:hidden p-2 -ml-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-50 flex-shrink-0"
                    onClick={onMenuClick}
                    aria-label="Open menu"
                >
                    <div className="icon-menu text-xl"></div>
                </button>
                <h2 className="text-lg md:text-xl font-semibold text-gray-800 truncate">{title}</h2>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative" ref={notifRef}>
                    <button
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-50 relative"
                        onClick={toggleNotif}
                        aria-label="Notifications"
                    >
                        <div className="icon-bell text-xl"></div>
                        {hasUnread && (
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                        )}
                    </button>

                    {notifOpen && (
                        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl border border-[var(--border-color)] shadow-lg overflow-hidden z-20">
                            <div className="px-4 py-3 border-b border-[var(--border-color)] flex items-center justify-between">
                                <h3 className="font-semibold text-gray-900 text-sm">Notifications</h3>
                                <button className="text-xs text-[var(--primary)] hover:underline" onClick={() => setNotifOpen(false)}>Close</button>
                            </div>
                            <div className="max-h-80 overflow-y-auto divide-y divide-[var(--border-color)]">
                                {notifications.length === 0 ? (
                                    <p className="text-sm text-gray-400 text-center py-6">No notifications yet.</p>
                                ) : (
                                    notifications.map((n) => (
                                        <div key={n.id} className="px-4 py-3 flex items-start gap-3 hover:bg-gray-50">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${n.color}`}>
                                                <div className={`icon-${n.icon} text-sm`}></div>
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm text-gray-800 leading-snug">{n.text}</p>
                                                <p className="text-xs text-gray-400 mt-0.5">{n.time}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}