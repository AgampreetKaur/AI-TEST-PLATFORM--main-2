class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error) { console.error("ChaptersApp error:", error); }
  render() {
    if (this.state.hasError) {
      return <div className="p-8 text-center text-red-500">Something went wrong loading this page.</div>;
    }
    return this.props.children;
  }
}

const SUBJECT_COLORS = {
  Mathematics: "bg-blue-50 text-blue-700",
  Physics: "bg-indigo-50 text-indigo-700",
  Chemistry: "bg-purple-50 text-purple-700",
  Biology: "bg-green-50 text-green-700",
  Geography: "bg-teal-50 text-teal-700",
  History: "bg-amber-50 text-amber-700",
  Civics: "bg-orange-50 text-orange-700",
  Economics: "bg-yellow-50 text-yellow-700",
  Hindi: "bg-rose-50 text-rose-700",
  English: "bg-sky-50 text-sky-700",
};

function ChaptersApp() {
  const [chapters, setChapters] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [filterSubject, setFilterSubject] = React.useState("all");
  const [studentGrade, setStudentGrade] = React.useState(null);

  const showToast = (msg) => {
    // minimal toast
    const el = document.createElement("div");
    el.className = "fixed bottom-6 right-6 bg-gray-900 text-white px-5 py-3 rounded-lg shadow-lg text-sm z-50";
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  };

  React.useEffect(() => {
    (async () => {
      try {
        const result = await API.chapters.listMine();
        setChapters(result.chapters || []);

        // Try to figure out the student's class for the header
        const me = API.auth.getUser();
        if (me) setStudentGrade(me.Grade || null);
      } catch (err) {
        console.error("chapters fetch error:", err);
        // If backend is unavailable, fall back to localStorage
        const local = JSON.parse(localStorage.getItem("chapters") || "[]");
        if (local.length) {
          setChapters(local.map(c => ({
            id: c.id,
            name: c.name || c.Name,
            subject: c.subject || c.Subject,
            class_level: c.class || c.ClassLevel || "",
            summary: c.summary || c.Summary || "",
            original_filename: null,
            created_at: c.date || null,
          })));
        } else {
          setError("Could not load chapters. Please check your connection.");
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const subjects = [...new Set(chapters.map(c => c.subject))].filter(Boolean).sort();

  const filtered = chapters.filter(ch => {
    if (filterSubject !== "all" && ch.subject !== filterSubject) return false;
    if (search && !ch.name.toLowerCase().includes(search.toLowerCase()) &&
        !(ch.subject || "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Group by subject for a nicer view
  const grouped = subjects.reduce((acc, sub) => {
    acc[sub] = filtered.filter(c => c.subject === sub);
    return acc;
  }, {});

  return (
    <DashboardLayout title="My Chapters">
      <div className="space-y-6">

        {/* Header + filters */}
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1">
            <div className="icon-search absolute left-3 top-2.5 text-gray-400"></div>
            <input
              type="text"
              placeholder="Search chapters…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--primary)] focus:outline-none text-sm"
            />
          </div>
          {subjects.length > 0 && (
            <select
              value={filterSubject}
              onChange={e => setFilterSubject(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--primary)] focus:outline-none"
            >
              <option value="all">All Subjects</option>
              {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
        </div>

        {/* Class banner */}
        {chapters.length > 0 && chapters[0].class_level && (
          <div className="flex items-center gap-2 text-sm text-indigo-700 bg-indigo-50 rounded-lg px-4 py-2.5">
            <div className="icon-graduation-cap"></div>
            Showing chapters for <strong>Class {chapters[0].class_level}</strong> — your enrolled class.
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="card p-12 text-center">
            <div className="icon-loader animate-spin text-3xl text-[var(--primary)] mb-3 flex justify-center"></div>
            <p className="text-gray-500">Loading your chapters…</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="card p-8 text-center">
            <div className="icon-wifi-off text-4xl text-gray-300 mb-3 flex justify-center"></div>
            <p className="text-gray-500">{error}</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && chapters.length === 0 && (
          <div className="card p-12 text-center">
            <div className="icon-book-open text-5xl text-gray-300 mb-4 flex justify-center"></div>
            <p className="font-medium text-gray-700">No chapters available yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Your admin hasn't uploaded any chapters for your class yet. Check back soon!
            </p>
          </div>
        )}

        {/* Chapters grouped by subject */}
        {!loading && !error && Object.entries(grouped).map(([sub, chs]) => chs.length === 0 ? null : (
          <div key={sub}>
            <div className="flex items-center gap-3 mb-3">
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${SUBJECT_COLORS[sub] || "bg-gray-100 text-gray-700"}`}>
                {sub}
              </span>
              <span className="text-xs text-gray-400">{chs.length} chapter{chs.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="card">
              <div className="divide-y divide-[var(--border-color)]">
                {chs.map(ch => (
                  <div key={ch.id} className="px-5 py-4 flex items-start justify-between gap-4 hover:bg-gray-50 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900">{ch.name}</p>
                      {ch.summary && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{ch.summary.slice(0, 160)}…</p>
                      )}
                    </div>
                    <div className="flex-shrink-0 text-xs text-gray-400">
                      {ch.created_at ? new Date(ch.created_at).toLocaleDateString() : ""}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}

        {/* Filtered empty state */}
        {!loading && !error && chapters.length > 0 && filtered.length === 0 && (
          <div className="card p-8 text-center">
            <p className="text-gray-500">No chapters match your search.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<ErrorBoundary><ChaptersApp /></ErrorBoundary>);
