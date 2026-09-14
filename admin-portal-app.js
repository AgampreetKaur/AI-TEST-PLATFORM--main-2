// ============================================================
// PDF text extraction (same as chapters-app.js)
// ============================================================

async function extractTextFromPDF(file, onProgress) {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";

    for (let p = 1; p <= pdf.numPages; p++) {
        if (onProgress) onProgress(p, pdf.numPages);
        const page = await pdf.getPage(p);
        const viewport = page.getViewport({ scale: 2.5 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;

        const result = await Tesseract.recognize(canvas.toDataURL("image/png"), "eng");
        fullText += `\n\nPAGE ${p}\n${result.data.text}`;
    }
    return fullText;
}

// ============================================================
// Constants
// ============================================================

const CLASS_OPTIONS = ["6","7","8","9","10","11","12"];
const SUBJECT_OPTIONS = [
    "Mathematics","Physics","Chemistry","Biology",
    "Geography","History","Civics","Economics","Hindi","English",
];

// ============================================================
// Auth guard — redirect to login if not admin
// ============================================================

async function verifyAdminOrRedirect() {
    try {
        await API.admin.me();   // throws if not admin
    } catch {
        window.location.href = "login.html";
    }
}

// ============================================================
// Sidebar component
// ============================================================

function AdminSidebar({ section, onNav, adminName }) {
    const navItems = [
        { id: "dashboard", icon: "layout-dashboard", label: "Dashboard" },
        { id: "chapters",  icon: "book-open",        label: "Chapters"  },
    ];

    return (
        <aside className="w-64 bg-white border-r border-[var(--border-color)] h-screen fixed left-0 top-0 flex flex-col z-40">
            <div className="h-16 flex items-center px-6 border-b border-[var(--border-color)] bg-[var(--primary)]">
                <div className="icon-shield-check text-white text-2xl mr-3"></div>
                <h1 className="font-bold text-lg text-white tracking-tight">Admin Portal</h1>
            </div>

            <nav className="flex-1 py-4 px-3 space-y-1">
                {navItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => onNav(item.id)}
                        className={`w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                            section === item.id
                                ? "bg-indigo-50 text-[var(--primary)]"
                                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        }`}
                    >
                        <div className={`icon-${item.icon} text-lg mr-3 ${section === item.id ? "text-[var(--primary)]" : "text-gray-400"}`}></div>
                        {item.label}
                    </button>
                ))}
            </nav>

            <div className="p-4 border-t border-[var(--border-color)]">
                <div className="flex items-center gap-3 mb-3">
                    <img
                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(adminName || "Admin")}&background=4f46e5&color=fff`}
                        className="w-9 h-9 rounded-full"
                        alt="Admin"
                    />
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{adminName || "Admin"}</p>
                        <p className="text-xs text-indigo-600 font-medium">Administrator</p>
                    </div>
                </div>
                <button
                    onClick={() => { API.auth.logout(); }}
                    className="w-full flex items-center justify-center gap-2 text-sm text-red-600 hover:bg-red-50 py-2 rounded-lg transition-colors"
                >
                    <div className="icon-log-out"></div> Logout
                </button>
            </div>
        </aside>
    );
}

// ============================================================
// Dashboard section — stats by class
// ============================================================

function DashboardSection({ chapters }) {
    const byClass = CLASS_OPTIONS.map(cl => ({
        cl,
        count: chapters.filter(c => c.class_level === cl).length,
        subjects: [...new Set(chapters.filter(c => c.class_level === cl).map(c => c.subject))],
    })).filter(r => r.count > 0);

    const total = chapters.length;
    const subjects = [...new Set(chapters.map(c => c.subject))].length;
    const classes = byClass.length;

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold text-gray-900">Dashboard</h2>
                <p className="text-sm text-gray-500 mt-1">Overview of uploaded chapters across all classes.</p>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: "Total Chapters", value: total, icon: "book-open", color: "bg-indigo-50 text-indigo-700" },
                    { label: "Classes Covered", value: classes, icon: "graduation-cap", color: "bg-emerald-50 text-emerald-700" },
                    { label: "Subjects", value: subjects, icon: "layers", color: "bg-orange-50 text-orange-700" },
                ].map(s => (
                    <div key={s.label} className="card p-5 flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${s.color}`}>
                            <div className={`icon-${s.icon} text-xl`}></div>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                            <p className="text-sm text-gray-500">{s.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Per-class breakdown */}
            {byClass.length > 0 ? (
                <div className="card">
                    <div className="px-6 py-4 border-b border-[var(--border-color)]">
                        <h3 className="font-semibold text-gray-900">Chapters by Class</h3>
                    </div>
                    <div className="divide-y divide-[var(--border-color)]">
                        {byClass.map(row => (
                            <div key={row.cl} className="px-6 py-4 flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-gray-900">Class {row.cl}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">{row.subjects.join(", ")}</p>
                                </div>
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-50 text-indigo-700">
                                    {row.count} chapter{row.count !== 1 ? "s" : ""}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="card p-12 text-center">
                    <div className="icon-book-open text-5xl text-gray-300 mx-auto mb-4"></div>
                    <p className="text-gray-500 font-medium">No chapters uploaded yet.</p>
                    <p className="text-sm text-gray-400 mt-1">Go to the Chapters section to upload your first PDF.</p>
                </div>
            )}
        </div>
    );
}

// ============================================================
// Upload modal
// ============================================================

function UploadModal({ onClose, onSaved }) {
    const [file, setFile] = React.useState(null);
    const [name, setName] = React.useState("");
    const [subject, setSubject] = React.useState(SUBJECT_OPTIONS[0]);
    const [classLevel, setClassLevel] = React.useState("9");
    const [uploading, setUploading] = React.useState(false);
    const [progress, setProgress] = React.useState("");
    const [error, setError] = React.useState("");
    const fileRef = React.useRef(null);

    const handleFile = (e) => {
        const f = e.target.files[0];
        if (!f) return;
        if (f.type !== "application/pdf") { setError("Please choose a PDF file."); return; }
        setFile(f);
        setName(f.name.replace(".pdf", "").replaceAll("_", " "));
        setError("");
    };

    const handleUpload = async () => {
        if (!file) { setError("Please select a PDF file."); return; }
        if (!name.trim()) { setError("Please enter a chapter name."); return; }

        setUploading(true);
        setError("");

        try {
            setProgress("Extracting text from PDF…");
            const text = await extractTextFromPDF(file, (p, total) => {
                setProgress(`Extracting text — page ${p} of ${total}…`);
            });

            if (!text || text.trim().length < 30) {
                setError("Could not extract enough text from this PDF. Try a text-based (not purely scanned) file.");
                setUploading(false);
                return;
            }

            setProgress("Saving chapter…");
            const saved = await API.admin.createChapter({
                name: name.trim(),
                subject,
                class_level: classLevel,
                text,
                original_filename: file.name,
            });

            onSaved(saved);
            onClose();
        } catch (err) {
            console.error("Upload error:", err);
            setError(err.message || "Upload failed. Please try again.");
        } finally {
            setUploading(false);
            setProgress("");
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
                <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)]">
                    <h3 className="text-lg font-bold text-gray-900">Upload Chapter PDF</h3>
                    <button onClick={onClose} disabled={uploading} className="text-gray-400 hover:text-gray-600">
                        <div className="icon-x text-xl"></div>
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {/* Drop zone */}
                    <div
                        onClick={() => !uploading && fileRef.current.click()}
                        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                            uploading ? "opacity-60 cursor-not-allowed border-gray-200 bg-gray-50" :
                            "cursor-pointer border-gray-300 bg-gray-50 hover:bg-gray-100"
                        }`}
                    >
                        <input type="file" accept="application/pdf" ref={fileRef} onChange={handleFile} className="hidden" />
                        <div className="icon-cloud-upload text-4xl text-[var(--primary)] mb-2 flex justify-center"></div>
                        <p className="font-medium text-gray-900">
                            {file ? file.name : "Click to choose a PDF"}
                        </p>
                        <p className="text-sm text-gray-400 mt-1">PDF files only</p>
                    </div>

                    {/* Chapter name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Chapter Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="e.g. Chapter 3 — Laws of Motion"
                            className="input-field"
                            disabled={uploading}
                        />
                    </div>

                    {/* Class + Subject */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                            <select value={classLevel} onChange={e => setClassLevel(e.target.value)} className="input-field" disabled={uploading}>
                                {CLASS_OPTIONS.map(c => <option key={c} value={c}>Class {c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                            <select value={subject} onChange={e => setSubject(e.target.value)} className="input-field" disabled={uploading}>
                                {SUBJECT_OPTIONS.map(s => <option key={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Progress */}
                    {progress && (
                        <div className="flex items-center gap-2 text-sm text-indigo-700 bg-indigo-50 rounded-lg px-3 py-2">
                            <div className="icon-loader animate-spin text-sm"></div>
                            {progress}
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
                    )}
                </div>

                <div className="px-6 pb-6 flex justify-end gap-3">
                    <button className="btn-secondary" onClick={onClose} disabled={uploading}>Cancel</button>
                    <button className="btn-primary" onClick={handleUpload} disabled={uploading}>
                        {uploading ? <div className="icon-loader animate-spin"></div> : <div className="icon-cloud-upload"></div>}
                        {uploading ? "Processing…" : "Upload & Save"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ============================================================
// Chapters management section
// ============================================================

function ChaptersSection({ chapters, onDelete, onUpload }) {
    const [filterClass, setFilterClass] = React.useState("all");
    const [filterSubject, setFilterSubject] = React.useState("all");
    const [search, setSearch] = React.useState("");
    const [showUpload, setShowUpload] = React.useState(false);
    const [deletingId, setDeletingId] = React.useState(null);

    const filtered = chapters.filter(ch => {
        if (filterClass !== "all" && ch.class_level !== filterClass) return false;
        if (filterSubject !== "all" && ch.subject !== filterSubject) return false;
        if (search && !ch.name.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    const handleDelete = async (ch) => {
        if (!confirm(`Delete "${ch.name}"? This cannot be undone.`)) return;
        setDeletingId(ch.id);
        try {
            await API.admin.deleteChapter(ch.id);
            onDelete(ch.id);
        } catch (err) {
            alert(err.message || "Delete failed.");
        } finally {
            setDeletingId(null);
        }
    };

    const handleSaved = (saved) => {
        onUpload(saved);
        setShowUpload(false);
    };

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Chapters</h2>
                    <p className="text-sm text-gray-500 mt-0.5">Upload PDFs and assign them to a class. Students see their class's chapters automatically.</p>
                </div>
                <button className="btn-primary" onClick={() => setShowUpload(true)}>
                    <div className="icon-upload"></div> Upload PDF
                </button>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-48">
                    <div className="icon-search absolute left-3 top-2.5 text-gray-400 text-sm"></div>
                    <input
                        type="text"
                        placeholder="Search chapters…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[var(--primary)] focus:outline-none"
                    />
                </div>
                <select value={filterClass} onChange={e => setFilterClass(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--primary)] focus:outline-none">
                    <option value="all">All Classes</option>
                    {CLASS_OPTIONS.map(c => <option key={c} value={c}>Class {c}</option>)}
                </select>
                <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--primary)] focus:outline-none">
                    <option value="all">All Subjects</option>
                    {SUBJECT_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>

            {/* Table */}
            <div className="card">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50 border-b border-[var(--border-color)]">
                                <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Chapter</th>
                                <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Subject</th>
                                <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Class</th>
                                <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Uploaded</th>
                                <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-color)]">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-5 py-12 text-center text-gray-400 text-sm">
                                        {chapters.length === 0
                                            ? "No chapters yet — click Upload PDF to add the first one."
                                            : "No chapters match the current filters."}
                                    </td>
                                </tr>
                            ) : filtered.map(ch => (
                                <tr key={ch.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-5 py-4">
                                        <p className="font-medium text-gray-900">{ch.name}</p>
                                        {ch.original_filename && (
                                            <p className="text-xs text-gray-400 mt-0.5">{ch.original_filename}</p>
                                        )}
                                    </td>
                                    <td className="px-5 py-4 text-sm text-gray-600">{ch.subject}</td>
                                    <td className="px-5 py-4">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                                            Class {ch.class_level}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 text-sm text-gray-500">
                                        {ch.created_at ? new Date(ch.created_at).toLocaleDateString() : "—"}
                                    </td>
                                    <td className="px-5 py-4 text-right">
                                        <button
                                            onClick={() => handleDelete(ch)}
                                            disabled={deletingId === ch.id}
                                            className="text-gray-400 hover:text-red-600 transition-colors disabled:opacity-40"
                                            title="Delete chapter"
                                        >
                                            {deletingId === ch.id
                                                ? <div className="icon-loader animate-spin text-lg"></div>
                                                : <div className="icon-trash text-lg"></div>}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {showUpload && <UploadModal onClose={() => setShowUpload(false)} onSaved={handleSaved} />}
        </div>
    );
}

// ============================================================
// Root admin app
// ============================================================

function AdminPortalApp() {
    const [ready, setReady] = React.useState(false);
    const [adminName, setAdminName] = React.useState("Admin");
    const [section, setSection] = React.useState("dashboard");
    const [chapters, setChapters] = React.useState([]);
    const [loadError, setLoadError] = React.useState("");

    // Verify admin on mount
    React.useEffect(() => {
        (async () => {
            try {
                const me = await API.admin.me();
                setAdminName(me.name || me.email || "Admin");
                const data = await API.admin.listChapters();
                setChapters(data.chapters || []);
                setReady(true);
            } catch (err) {
                console.error("Admin portal error:", err);
                // Not admin — redirect
                window.location.href = "login.html";
            }
        })();
    }, []);

    const handleChapterSaved = (saved) => {
        setChapters(prev => [saved, ...prev]);
    };

    const handleChapterDeleted = (id) => {
        setChapters(prev => prev.filter(c => c.id !== id));
    };

    if (!ready) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="icon-loader animate-spin text-4xl text-[var(--primary)] mb-4"></div>
                    <p className="text-gray-500">Loading admin portal…</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen overflow-hidden">
            <AdminSidebar section={section} onNav={setSection} adminName={adminName} />

            <main className="flex-1 ml-64 overflow-y-auto">
                {/* Top bar */}
                <header className="h-16 bg-white border-b border-[var(--border-color)] flex items-center justify-between px-8 sticky top-0 z-10">
                    <h2 className="text-lg font-semibold text-gray-800 capitalize">{section}</h2>
                    <div className="flex items-center gap-3">
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full font-medium">Administrator</span>
                        <img
                            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(adminName)}&background=4f46e5&color=fff&size=32`}
                            className="w-8 h-8 rounded-full"
                            alt="Admin"
                        />
                    </div>
                </header>

                {/* Content */}
                <div className="p-8">
                    {section === "dashboard" && (
                        <DashboardSection chapters={chapters} />
                    )}
                    {section === "chapters" && (
                        <ChaptersSection
                            chapters={chapters}
                            onDelete={handleChapterDeleted}
                            onUpload={handleChapterSaved}
                        />
                    )}
                </div>
            </main>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<AdminPortalApp />);
