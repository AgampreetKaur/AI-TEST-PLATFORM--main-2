function Header({ title, onMenuClick }) {
    const [notifOpen, setNotifOpen] = React.useState(false);
    const [notifications, setNotifications] = React.useState([]);
    const [unreadCount, setUnreadCount] = React.useState(0);
    const notifRef = React.useRef(null);
    const knownIdsRef = React.useRef(new Set());

    const iconFor = (type) => {
        if (type === "test_starting") return { icon: "zap", color: "text-emerald-600 bg-emerald-50" };
        if (type === "submit_reminder") return { icon: "alarm-clock", color: "text-orange-600 bg-orange-50" };
        return { icon: "calendar-clock", color: "text-blue-600 bg-blue-50" };
    };

    const timeAgo = (isoString) => {
        if (!isoString) return "";
        const diffMs = Date.now() - new Date(isoString).getTime();
        const mins = Math.floor(diffMs / 60000);
        if (mins < 1) return "just now";
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        return `${Math.floor(hours / 24)}d ago`;
    };

    const loadNotifications = async (isPoll) => {
        try {
            const result = await API.notifications.listMine();

            if (isPoll && typeof Notification !== "undefined" && Notification.permission === "granted") {
                result.notifications.forEach((n) => {
                    if (!knownIdsRef.current.has(n.id)) {
                        new Notification(n.title, { body: n.message || "" });
                    }
                });
            }

            knownIdsRef.current = new Set(result.notifications.map((n) => n.id));
            setNotifications(result.notifications);
            setUnreadCount(result.unread_count);
        } catch (e) {
            console.error("Failed to load notifications:", e);
        }
    };

    React.useEffect(() => {
        loadNotifications(false);

        if (typeof Notification !== "undefined" && Notification.permission === "default") {
            Notification.requestPermission();
        }

        const interval = setInterval(() => loadNotifications(true), 20000);
        return () => clearInterval(interval);
    }, []);

    const toggleNotif = async () => {
        const opening = !notifOpen;
        setNotifOpen(opening);
        if (opening && unreadCount > 0) {
            try {
                await API.notifications.markAllRead();
                setUnreadCount(0);
            } catch (e) {
                console.error("Failed to mark notifications read:", e);
            }
        }
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
                        {unreadCount > 0 && (
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
                                    notifications.map((n) => {
                                        const { icon, color } = iconFor(n.type);
                                        return (
                                            <div key={n.id} className="px-4 py-3 flex items-start gap-3 hover:bg-gray-50">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${color}`}>
                                                    <div className={`icon-${icon} text-sm`}></div>
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm text-gray-800 leading-snug">{n.title}</p>
                                                    {n.message && <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>}
                                                    <p className="text-xs text-gray-400 mt-0.5">{timeAgo(n.created_at)}</p>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}