function StatCard({ title, value, icon, trend, colorClass = "text-[var(--primary)]", bgClass = "bg-indigo-50" }) {
    return (
        <div className="card p-6" data-name="stat-card" data-file="components/StatCard.js">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-medium text-[var(--text-muted)] mb-1">{title}</p>
                    <h3 className="text-2xl font-bold text-[var(--text-main)]">{value}</h3>
                </div>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${bgClass}`}>
                    <div className={`icon-${icon} text-2xl ${colorClass}`}></div>
                </div>
            </div>
            {trend && (
                <div className="mt-4 flex items-center text-sm">
                    <span className={trend.isPositive ? "text-emerald-600 flex items-center" : "text-red-600 flex items-center"}>
                        <div className={`icon-${trend.isPositive ? 'trending-up' : 'trending-down'} mr-1 text-base`}></div>
                        {trend.value}%
                    </span>
                    <span className="text-gray-500 ml-2">vs last month</span>
                </div>
            )}
        </div>
    );
}