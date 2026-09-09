// ============================================================
// Reports & Analytics
// Supports BOTH:
// 1. Parent portal -> select child
// 2. Student portal -> automatically show own report
// ============================================================


class ErrorBoundary extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            hasError: false
        };
    }


    static getDerivedStateFromError() {

        return {
            hasError: true
        };

    }


    componentDidCatch(error) {

        console.error(
            "Reports error:",
            error
        );

    }


    render() {

        return this.state.hasError

            ? (
                <div className="p-8 text-red-500">
                    Error loading page
                </div>
            )

            : this.props.children;

    }

}



const DEFAULT_BACKEND =
    "http://127.0.0.1:8000";



function ReportsApp() {

    const [backendUrl] =
        React.useState(
            () =>
                localStorage.getItem(
                    "grader_backend_url"
                ) ||
                DEFAULT_BACKEND
        );


    const [loading, setLoading] =
        React.useState(true);


    const [error, setError] =
        React.useState(null);


    const [report, setReport] =
        React.useState(null);


    const [children, setChildren] =
        React.useState([]);


    const [selectedStudentId, setSelectedStudentId] =
        React.useState("");


    const [selectedSubject, setSelectedSubject] =
        React.useState("");


    const [toast, setToast] =
        React.useState(null);


    const [downloading, setDownloading] =
        React.useState(false);


    const [expandedTopic, setExpandedTopic] =
        React.useState(null);


    const [granularity, setGranularity] =
        React.useState("week");


    // ========================================================
    // DETECT STUDENT LOGIN
    // ========================================================

    const getStudentIdFromStorage = () => {

        // Primary key used by student login
        const studentId =
            localStorage.getItem(
                "student_id"
            );


        if (studentId) {
            return studentId;
        }


        // Fallback: try student session
        try {

            const storedSession =
                localStorage.getItem(
                    "student_session"
                );


            if (storedSession) {

                const session =
                    JSON.parse(
                        storedSession
                    );


                return (
                    session?.student_id ||
                    session?.student_login_id ||
                    session?.student?.id ||
                    ""
                );

            }

        } catch (e) {

            console.warn(
                "Could not parse student session:",
                e
            );

        }


        return "";

    };



    const isStudentLoggedIn = () => {

        return Boolean(
            localStorage.getItem(
                "student_access_token"
            )
        );

    };



    // ========================================================
    // LOAD REPORT
    // ========================================================

    const loadReport =
        React.useCallback(
            async () => {

                setLoading(true);
                setError(null);


                try {

                    // ==================================================
                    // STUDENT MODE
                    // ==================================================

                    if (isStudentLoggedIn()) {

                        console.log(
                            "Reports: Student mode"
                        );


                        const studentId =
                            getStudentIdFromStorage();


                        if (!studentId) {

                            throw new Error(
                                "Student ID is missing. Please login again."
                            );

                        }


                        console.log(
                            "Reports: Loading own student report:",
                            studentId
                        );


                        setChildren([]);

                        setSelectedStudentId(
                            studentId
                        );


                        const data =
                            await API.reports.getStudentReport(
                                studentId
                            );


                        setReport(data);

                        return;

                    }


                    // ==================================================
                    // PARENT MODE
                    // ==================================================

                    console.log(
                        "Reports: Parent mode"
                    );


                    const session =
                        await API.auth.getSession();


                    if (!session) {

                        window.location.href =
                            "login.html";

                        return;

                    }


                    // --------------------------------------------------
                    // GET PARENT + CHILDREN
                    // --------------------------------------------------

                    const directory =
                        await API.directory.getMe();


                    const childList =
                        directory?.children || [];


                    setChildren(
                        childList
                    );


                    if (!childList.length) {

                        setReport(null);

                        setSelectedStudentId(
                            ""
                        );


                        throw new Error(
                            "No student is linked to this parent account yet. Please add a student first."
                        );

                    }


                    // --------------------------------------------------
                    // SELECT STUDENT
                    // --------------------------------------------------

                    let studentId =
                        selectedStudentId;


                    const stillExists =
                        childList.some(
                            child =>
                                child.id ===
                                studentId
                        );


                    if (
                        !studentId ||
                        !stillExists
                    ) {

                        studentId =
                            childList[0].id;


                        setSelectedStudentId(
                            studentId
                        );

                    }


                    // --------------------------------------------------
                    // GET STUDENT REPORT
                    // --------------------------------------------------

                    const data =
                        await API.reports.getStudentReport(
                            studentId
                        );


                    setReport(data);


                } catch (e) {

                    console.error(
                        "Report API error:",
                        e
                    );


                    setError(

                        /401|403/i.test(
                            e.message || ""
                        )

                            ? "You are not authorized to view this student's report. Please login again."

                            : /Failed to fetch|NetworkError|fetch/i.test(
                                e.message || ""
                            )

                                ? `Can't reach the homework backend at ${backendUrl}. Make sure it is running.`

                                : (
                                    e.message ||
                                    "Unable to load student report."
                                )

                    );

                } finally {

                    setLoading(false);

                }

            },
            [
                backendUrl,
                selectedStudentId
            ]
        );



    React.useEffect(
        () => {

            loadReport();

        },
        [loadReport]
    );



    // ========================================================
    // STUDENT / CHILD CHANGE
    // ========================================================

    const handleStudentChange =
        async (
            studentId
        ) => {

            setSelectedStudentId(
                studentId
            );

            setSelectedSubject("");

            setReport(null);

            setLoading(true);

            setError(null);


            try {

                const data =
                    await API.reports.getStudentReport(
                        studentId
                    );


                setReport(data);


            } catch (e) {

                console.error(
                    "Student report error:",
                    e
                );


                setError(
                    e.message ||
                    "Unable to load student report."
                );


            } finally {

                setLoading(false);

            }

        };



    // ========================================================
    // HELPERS
    // ========================================================

    const fmtShortDate =
        (
            iso
        ) => {

            if (!iso) {
                return "";
            }


            try {

                return new Date(
                    iso
                ).toLocaleDateString(
                    undefined,
                    {
                        day: "numeric",
                        month: "short"
                    }
                );

            } catch {

                return "";

            }

        };



    const percentage =
        (
            score,
            max
        ) => {

            if (
                !max ||
                max === 0
            ) {
                return 0;
            }


            return Math.round(
                (score / max) * 100
            );

        };



    // ========================================================
    // SUBJECT DATA
    // ========================================================

    const subjects =
        React.useMemo(
            () => {

                if (
                    !report ||
                    !report.subjects
                ) {

                    return [];

                }


                return report.subjects;

            },
            [report]
        );



    const filteredSubjects =
        React.useMemo(
            () => {

                if (
                    !selectedSubject
                ) {

                    return subjects;

                }


                return subjects.filter(
                    s =>
                        s.subject ===
                        selectedSubject
                );

            },
            [
                subjects,
                selectedSubject
            ]
        );



    // ========================================================
    // HOMEWORK HISTORY
    // ========================================================

    const homeworkHistory =
        React.useMemo(
            () => {

                if (
                    !report ||
                    !report.homework_history
                ) {

                    return [];

                }


                return report.homework_history;

            },
            [report]
        );



    // ========================================================
    // WEAK / STRONG SUBJECTS
    // ========================================================

    const weakSubjects =
        React.useMemo(
            () => {

                return filteredSubjects
                    .filter(
                        s =>
                            Number(
                                s.average
                            ) < 70
                    )
                    .sort(
                        (a, b) =>
                            Number(
                                a.average
                            ) -
                            Number(
                                b.average
                            )
                    );

            },
            [filteredSubjects]
        );



    const strongSubjects =
        React.useMemo(
            () => {

                return filteredSubjects
                    .filter(
                        s =>
                            Number(
                                s.average
                            ) >= 80
                    )
                    .sort(
                        (a, b) =>
                            Number(
                                b.average
                            ) -
                            Number(
                                a.average
                            )
                    );

            },
            [filteredSubjects]
        );



    // ========================================================
    // CHART DATA
    // ========================================================

    const chartData =
        React.useMemo(
            () => {

                if (
                    !filteredSubjects.length
                ) {

                    return {
                        labels: [],
                        datasets: []
                    };

                }


                return {

                    labels:
                        filteredSubjects.map(
                            s =>
                                s.subject
                        ),


                    datasets: [

                        {

                            label:
                                selectedSubject
                                    ? "Average score"
                                    : "Average score by subject",


                            data:
                                filteredSubjects.map(
                                    s =>
                                        Number(
                                            s.average
                                        )
                                ),


                            backgroundColor: [
                                "#4f46e5",
                                "#3b82f6",
                                "#10b981",
                                "#f59e0b",
                                "#ec4899",
                                "#8b5cf6"
                            ],


                            borderRadius: 6

                        }

                    ]

                };

            },
            [
                filteredSubjects,
                selectedSubject
            ]
        );



    // ========================================================
    // PROGRESS CHART
    // ========================================================

    const progressChartData =
        React.useMemo(
            () => {

                if (
                    !homeworkHistory.length
                ) {

                    return {
                        labels: [],
                        datasets: []
                    };

                }


                const history =
                    [
                        ...homeworkHistory
                    ].reverse();


                const labels =
                    history.map(
                        (
                            h,
                            index
                        ) => {

                            if (
                                h.created_at
                            ) {

                                return fmtShortDate(
                                    h.created_at
                                );

                            }


                            if (
                                h.submission_date
                            ) {

                                return fmtShortDate(
                                    h.submission_date
                                );

                            }


                            return `Test ${index + 1}`;

                        }
                    );


                const values =
                    history.map(
                        h => {

                            if (
                                h.percentage != null
                            ) {

                                return Number(
                                    h.percentage
                                );

                            }


                            return percentage(
                                Number(
                                    h.score || 0
                                ),
                                Number(
                                    h.max_score ||
                                    h.max_marks ||
                                    10
                                )
                            );

                        }
                    );


                return {

                    labels,

                    datasets: [

                        {

                            label:
                                "Homework score",

                            data:
                                values,

                            borderColor:
                                "#4f46e5",

                            backgroundColor:
                                "#4f46e5",

                            tension:
                                0.3,

                            spanGaps:
                                true

                        }

                    ]

                };

            },
            [
                homeworkHistory
            ]
        );



    // ========================================================
    // CSV EXPORT
    // ========================================================

    const csvEscape =
        (
            value
        ) => {

            const str =
                String(
                    value == null
                        ? ""
                        : value
                );


            return /[",\n]/.test(
                str
            )

                ? `"${str.replace(
                    /"/g,
                    '""'
                )}"`

                : str;

        };



    const handleDownload =
        () => {

            if (!report) {

                setToast(
                    "Nothing to export yet — no report available."
                );


                setTimeout(
                    () =>
                        setToast(
                            null
                        ),
                    3000
                );


                return;

            }


            setDownloading(
                true
            );


            try {

                const rows = [];


                rows.push([
                    "Student Performance Report"
                ]);


                rows.push([
                    "Student ID",
                    report.student?.id || ""
                ]);


                rows.push([
                    "Student",
                    report.student?.name || ""
                ]);


                rows.push([
                    "Grade",
                    report.student?.grade || ""
                ]);


                rows.push([
                    "Overall Average",
                    report.overall_average + "%"
                ]);


                rows.push([
                    "Total Homeworks",
                    report.total_homeworks
                ]);


                rows.push([]);


                rows.push([
                    "Subject Summary"
                ]);


                rows.push([
                    "Subject",
                    "Average %",
                    "Homework Count",
                    "Performance"
                ]);


                subjects.forEach(
                    s => {

                        rows.push([
                            s.subject,
                            s.average,
                            s.homework_count,
                            s.performance
                        ]);

                    }
                );


                rows.push([]);


                rows.push([
                    "Homework History"
                ]);


                rows.push([
                    "Subject",
                    "Score",
                    "Max Score",
                    "Percentage",
                    "Status"
                ]);


                homeworkHistory.forEach(
                    h => {

                        rows.push([
                            h.subject || "",
                            h.score || "",
                            h.max_score ||
                                h.max_marks ||
                                "",
                            h.percentage != null
                                ? h.percentage
                                : "",
                            h.status || ""
                        ]);

                    }
                );


                const csvContent =
                    rows
                        .map(
                            row =>
                                row
                                    .map(
                                        csvEscape
                                    )
                                    .join(",")
                        )
                        .join("\n");


                const blob =
                    new Blob(
                        [
                            csvContent
                        ],
                        {
                            type:
                                "text/csv;charset=utf-8;"
                        }
                    );


                const url =
                    URL.createObjectURL(
                        blob
                    );


                const a =
                    document.createElement(
                        "a"
                    );


                const dateStamp =
                    new Date()
                        .toISOString()
                        .slice(
                            0,
                            10
                        );


                a.href =
                    url;


                a.download =
                    `student-performance-report-${dateStamp}.csv`;


                document.body.appendChild(
                    a
                );


                a.click();


                document.body.removeChild(
                    a
                );


                URL.revokeObjectURL(
                    url
                );


                setToast(
                    "Report downloaded."
                );


            } catch (e) {

                console.error(e);


                setToast(
                    "Couldn't build the export."
                );

            } finally {

                setDownloading(
                    false
                );


                setTimeout(
                    () =>
                        setToast(
                            null
                        ),
                    3000
                );

            }

        };



    // ========================================================
    // SUBJECT CARD
    // ========================================================

    const renderSubjectList =
        (
            list,
            type
        ) => {

            if (!list.length) {

                return (

                    <p className="text-sm text-gray-400">

                        {
                            type === "weak"
                                ? "No weak subjects identified yet."
                                : "No strong subjects identified yet."
                        }

                    </p>

                );

            }


            return (

                <div className="space-y-3">

                    {
                        list.map(
                            (
                                s,
                                i
                            ) => {

                                const avg =
                                    Number(
                                        s.average
                                    );


                                const isWeak =
                                    type === "weak";


                                return (

                                    <div
                                        key={
                                            s.subject
                                        }
                                        className={
                                            `p-3 rounded-lg text-sm font-medium border ${
                                                isWeak
                                                    ? "bg-red-50 text-red-800 border-red-100"
                                                    : "bg-emerald-50 text-emerald-800 border-emerald-100"
                                            }`
                                        }
                                    >

                                        <div className="flex items-center justify-between">

                                            <span>

                                                {
                                                    i + 1
                                                }.
                                                {" "}
                                                {
                                                    s.subject
                                                }

                                            </span>


                                            <span>
                                                Avg {avg}%
                                            </span>

                                        </div>

                                    </div>

                                );

                            }
                        )
                    }

                </div>

            );

        };



    // ========================================================
    // HOMEWORK HISTORY TABLE
    // ========================================================

    const renderHomeworkHistory =
        () => {

            if (
                !homeworkHistory.length
            ) {

                return (

                    <tr>

                        <td
                            colSpan="6"
                            className="text-center py-8 text-gray-400"
                        >

                            No graded homework yet.

                        </td>

                    </tr>

                );

            }


            const rows =
                selectedSubject

                    ? homeworkHistory.filter(
                        h =>
                            (
                                h.subject ||
                                ""
                            ).toLowerCase() ===
                            selectedSubject
                                .toLowerCase()
                    )

                    : homeworkHistory;


            if (!rows.length) {

                return (

                    <tr>

                        <td
                            colSpan="6"
                            className="text-center py-8 text-gray-400"
                        >

                            No homework found for this subject.

                        </td>

                    </tr>

                );

            }


            return rows.map(
                (
                    h,
                    index
                ) => {

                    const score =
                        Number(
                            h.score || 0
                        );


                    const maxScore =
                        Number(
                            h.max_score ||
                            h.max_marks ||
                            10
                        );


                    const pct =
                        h.percentage != null

                            ? Number(
                                h.percentage
                            )

                            : percentage(
                                score,
                                maxScore
                            );


                    return (

                        <tr
                            key={
                                h.submission_id ||
                                index
                            }
                            className="hover:bg-gray-50"
                        >

                            <td className="px-6 py-4 font-medium">

                                {
                                    h.subject ||
                                    "Homework"
                                }

                            </td>


                            <td className="px-6 py-4">

                                {
                                    score
                                }
                                /
                                {
                                    maxScore
                                }

                            </td>


                            <td className="px-6 py-4">

                                {pct}%

                            </td>


                            <td className="px-6 py-4">

                                {
                                    h.status ||
                                    "Graded"
                                }

                            </td>


                            <td className="px-6 py-4">

                                {
                                    fmtShortDate(
                                        h.created_at ||
                                        h.submission_date
                                    )
                                }

                            </td>


                            <td className="px-6 py-4 text-right">

                                <button
                                    className="text-indigo-600 font-medium hover:underline"
                                    onClick={() => {

                                        if (
                                            h.submission_id
                                        ) {

                                            window.location.href =
                                                `/submissions/${h.submission_id}`;

                                        }

                                    }}
                                >

                                    View

                                </button>

                            </td>

                        </tr>

                    );

                }
            );

        };



    // ========================================================
    // RENDER
    // ========================================================

    const studentMode =
        isStudentLoggedIn();


    return (

        <DashboardLayout
            title="Reports & Analytics"
        >

            <div className="space-y-6 relative">


                {/* HEADER */}

                <div className="flex justify-between items-center flex-wrap gap-3">

                    <div>

                        <h2 className="text-xl font-bold text-gray-900">

                            {
                                studentMode
                                    ? "My Performance Overview"
                                    : "Student Performance Overview"
                            }

                        </h2>


                        <p className="text-sm text-gray-500 mt-1">

                            Based on your graded homework.

                        </p>

                    </div>


                    <button
                        className="btn-primary"
                        onClick={
                            handleDownload
                        }
                        disabled={
                            downloading
                        }
                    >

                        {
                            downloading

                                ? (
                                    <div className="icon-loader animate-spin"></div>
                                )

                                : (
                                    <div className="icon-download"></div>
                                )
                        }


                        {
                            downloading
                                ? "Exporting..."
                                : "Export My Report"
                        }

                    </button>

                </div>



                {/* STUDENT SELECTOR - PARENT ONLY */}

                {
                    !studentMode &&
                    !loading &&
                    !error &&
                    children.length > 0 && (

                        <div className="card p-5">

                            <div className="flex flex-wrap items-center gap-4">

                                <div>

                                    <p className="text-xs text-gray-500 mb-1">

                                        Student

                                    </p>


                                    <select
                                        value={
                                            selectedStudentId
                                        }
                                        onChange={
                                            e =>
                                                handleStudentChange(
                                                    e.target.value
                                                )
                                        }
                                        className="border border-gray-300 rounded-lg px-3 py-2 min-w-[220px] outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                    >

                                        {
                                            children.map(
                                                child => (

                                                    <option
                                                        key={
                                                            child.id
                                                        }
                                                        value={
                                                            child.id
                                                        }
                                                    >

                                                        {
                                                            child.name
                                                        }

                                                        {
                                                            child.grade
                                                                ? ` — Grade ${child.grade}`
                                                                : ""
                                                        }

                                                    </option>

                                                )
                                            )
                                        }

                                    </select>

                                </div>

                            </div>

                        </div>

                    )
                }



                {/* STUDENT INFO */}

                {
                    !loading &&
                    !error &&
                    report && (

                        <div className="card p-5">

                            <div className="flex flex-wrap gap-6">

                                <div>

                                    <p className="text-xs text-gray-500">

                                        Student

                                    </p>


                                    <p className="font-semibold">

                                        {
                                            report.student?.name ||
                                            "Student"
                                        }

                                    </p>

                                </div>


                                <div>

                                    <p className="text-xs text-gray-500">

                                        Grade

                                    </p>


                                    <p className="font-semibold">

                                        {
                                            report.student?.grade ||
                                            "—"
                                        }

                                    </p>

                                </div>


                                <div>

                                    <p className="text-xs text-gray-500">

                                        Overall Average

                                    </p>


                                    <p className="font-semibold text-indigo-600">

                                        {
                                            report.overall_average ??
                                            0
                                        }%

                                    </p>

                                </div>


                                <div>

                                    <p className="text-xs text-gray-500">

                                        Total Homeworks

                                    </p>


                                    <p className="font-semibold">

                                        {
                                            report.total_homeworks ??
                                            0
                                        }

                                    </p>

                                </div>

                            </div>

                        </div>

                    )
                }



                {/* SUBJECT FILTER */}

                {
                    !loading &&
                    !error &&
                    report &&
                    subjects.length > 0 && (

                        <div className="flex flex-wrap gap-2">

                            <button
                                className={
                                    `px-3 py-1.5 rounded-full text-sm font-medium border ${
                                        !selectedSubject
                                            ? "bg-indigo-50 border-[var(--primary)] text-[var(--primary)]"
                                            : "border-gray-300 text-gray-600 hover:bg-gray-50"
                                    }`
                                }
                                onClick={() =>
                                    setSelectedSubject("")
                                }
                            >

                                All subjects

                            </button>


                            {
                                subjects.map(
                                    s => (

                                        <button
                                            key={
                                                s.subject
                                            }
                                            className={
                                                `px-3 py-1.5 rounded-full text-sm font-medium border ${
                                                    selectedSubject ===
                                                    s.subject
                                                        ? "bg-indigo-50 border-[var(--primary)] text-[var(--primary)]"
                                                        : "border-gray-300 text-gray-600 hover:bg-gray-50"
                                                }`
                                            }
                                            onClick={() =>
                                                setSelectedSubject(
                                                    s.subject
                                                )
                                            }
                                        >

                                            {
                                                s.subject
                                            }

                                            <span className="text-xs opacity-70">

                                                {" "}
                                                (
                                                {
                                                    s.average
                                                }%
                                                )

                                            </span>

                                        </button>

                                    )
                                )
                            }

                        </div>

                    )
                }



                {/* LOADING */}

                {
                    loading && (

                        <div className="card p-10 text-center text-gray-400">

                            <div className="icon-loader animate-spin text-2xl mb-2"></div>

                            Loading student performance data…

                        </div>

                    )
                }



                {/* ERROR */}

                {
                    !loading &&
                    error && (

                        <div className="card p-6 bg-red-50 border-red-100 text-red-700 text-sm">

                            {
                                error
                            }

                        </div>

                    )
                }



                {/* EMPTY */}

                {
                    !loading &&
                    !error &&
                    report &&
                    subjects.length === 0 && (

                        <div className="card p-10 text-center text-gray-500">

                            No graded homework yet.

                            <p className="text-sm mt-2">

                                Once you upload and get graded work back,
                                your performance will appear here.

                            </p>

                        </div>

                    )
                }



                {/* MAIN REPORT */}

                {
                    !loading &&
                    !error &&
                    report &&
                    subjects.length > 0 && (

                        <>


                            {/* TOP SECTION */}

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">


                                {/* SUBJECT CHART */}

                                <div className="lg:col-span-2 card p-6">

                                    <h3 className="text-lg font-semibold mb-4 text-gray-800">

                                        {
                                            selectedSubject
                                                ? `${selectedSubject} Performance`
                                                : "Subject-wise Performance"
                                        }

                                    </h3>


                                    {
                                        chartData.labels.length > 0

                                            ? (

                                                <CustomChart
                                                    type="bar"
                                                    data={
                                                        chartData
                                                    }
                                                />

                                            )

                                            : (

                                                <p className="text-sm text-gray-400 text-center py-16">

                                                    No data available.

                                                </p>

                                            )
                                    }

                                </div>



                                {/* WEAK / STRONG */}

                                <div className="card p-6 bg-gradient-to-br from-indigo-50 to-white">

                                    <div>

                                        <h3 className="text-lg font-semibold mb-4 text-indigo-900 flex items-center gap-2">

                                            <div className="icon-triangle-alert text-orange-500"></div>

                                            Weak Subjects

                                        </h3>


                                        {
                                            renderSubjectList(
                                                weakSubjects,
                                                "weak"
                                            )
                                        }

                                    </div>


                                    <div className="mt-6">

                                        <h3 className="text-lg font-semibold mb-4 text-emerald-900 flex items-center gap-2">

                                            <div className="icon-medal text-emerald-500"></div>

                                            Strong Subjects

                                        </h3>


                                        {
                                            renderSubjectList(
                                                strongSubjects,
                                                "strong"
                                            )
                                        }

                                    </div>

                                </div>

                            </div>



                            {/* PROGRESS */}

                            <div className="card p-6">

                                <div className="flex items-center justify-between flex-wrap gap-3 mb-4">

                                    <h3 className="text-lg font-semibold text-gray-800">

                                        Progress Over Time

                                    </h3>


                                    <div className="flex gap-2">

                                        {
                                            [
                                                "week",
                                                "month"
                                            ].map(
                                                g => (

                                                    <button
                                                        key={g}
                                                        className={
                                                            `px-3 py-1.5 rounded-full text-sm font-medium border capitalize ${
                                                                granularity === g
                                                                    ? "bg-indigo-50 border-[var(--primary)] text-[var(--primary)]"
                                                                    : "border-gray-300 text-gray-600 hover:bg-gray-50"
                                                            }`
                                                        }
                                                        onClick={() =>
                                                            setGranularity(
                                                                g
                                                            )
                                                        }
                                                    >

                                                        {
                                                            g
                                                        }ly

                                                    </button>

                                                )
                                            )
                                        }

                                    </div>

                                </div>


                                {
                                    progressChartData.labels.length > 0

                                        ? (

                                            <CustomChart
                                                type="line"
                                                data={
                                                    progressChartData
                                                }
                                                options={{
                                                    plugins: {
                                                        legend: {
                                                            display: true,
                                                            position: "bottom"
                                                        }
                                                    },

                                                    scales: {

                                                        y: {

                                                            min: 0,

                                                            max: 100,

                                                            ticks: {

                                                                callback:
                                                                    value =>
                                                                        value +
                                                                        "%"

                                                            }

                                                        }

                                                    }

                                                }}
                                            />

                                        )

                                        : (

                                            <p className="text-sm text-gray-400 text-center py-16">

                                                Not enough graded homework yet
                                                to show progress.

                                            </p>

                                        )
                                }

                            </div>



                            {/* SUBJECT TABLE */}

                            <div className="card">

                                <div className="p-4 border-b border-[var(--border-color)] bg-gray-50">

                                    <h3 className="font-bold text-gray-900">

                                        Subject Summary

                                    </h3>

                                </div>


                                <div className="overflow-x-auto">

                                    <table className="w-full text-left border-collapse">

                                        <thead>

                                            <tr className="bg-white border-b border-[var(--border-color)] text-gray-500 text-sm">

                                                <th className="px-6 py-3 font-medium">

                                                    Subject

                                                </th>

                                                <th className="px-6 py-3 font-medium">

                                                    Average Score

                                                </th>

                                                <th className="px-6 py-3 font-medium">

                                                    Homework Count

                                                </th>

                                                <th className="px-6 py-3 font-medium">

                                                    Performance

                                                </th>

                                            </tr>

                                        </thead>


                                        <tbody className="divide-y divide-[var(--border-color)]">

                                            {
                                                filteredSubjects.map(
                                                    s => (

                                                        <tr
                                                            key={
                                                                s.subject
                                                            }
                                                            className="hover:bg-gray-50"
                                                        >

                                                            <td className="px-6 py-4 font-medium">

                                                                <div className="flex items-center gap-3">

                                                                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">

                                                                        {
                                                                            s.subject
                                                                                .slice(
                                                                                    0,
                                                                                    2
                                                                                )
                                                                                .toUpperCase()
                                                                        }

                                                                    </div>


                                                                    {
                                                                        s.subject
                                                                    }

                                                                </div>

                                                            </td>


                                                            <td className="px-6 py-4 font-medium">

                                                                {
                                                                    s.average
                                                                }%

                                                            </td>


                                                            <td className="px-6 py-4 text-gray-600 text-sm">

                                                                {
                                                                    s.homework_count
                                                                }

                                                            </td>


                                                            <td className="px-6 py-4">

                                                                <span
                                                                    className={
                                                                        `px-2 py-1 rounded-full text-xs font-medium ${
                                                                            s.performance === "Strong"
                                                                                ? "bg-green-100 text-green-700"
                                                                                : s.performance === "Weak"
                                                                                    ? "bg-red-100 text-red-700"
                                                                                    : "bg-yellow-100 text-yellow-700"
                                                                        }`
                                                                    }
                                                                >

                                                                    {
                                                                        s.performance
                                                                    }

                                                                </span>

                                                            </td>

                                                        </tr>

                                                    )
                                                )
                                            }

                                        </tbody>

                                    </table>

                                </div>

                            </div>



                            {/* HOMEWORK HISTORY */}

                            <div className="card">

                                <div className="p-4 border-b border-[var(--border-color)] bg-gray-50">

                                    <h3 className="font-bold text-gray-900">

                                        Homework History

                                    </h3>

                                </div>


                                <div className="overflow-x-auto">

                                    <table className="w-full text-left border-collapse">

                                        <thead>

                                            <tr className="bg-white border-b border-[var(--border-color)] text-gray-500 text-sm">

                                                <th className="px-6 py-3 font-medium">

                                                    Subject

                                                </th>

                                                <th className="px-6 py-3 font-medium">

                                                    Score

                                                </th>

                                                <th className="px-6 py-3 font-medium">

                                                    Percentage

                                                </th>

                                                <th className="px-6 py-3 font-medium">

                                                    Status

                                                </th>

                                                <th className="px-6 py-3 font-medium">

                                                    Date

                                                </th>

                                                <th className="px-6 py-3 font-medium text-right">

                                                    Action

                                                </th>

                                            </tr>

                                        </thead>


                                        <tbody className="divide-y divide-[var(--border-color)]">

                                            {
                                                renderHomeworkHistory()
                                            }

                                        </tbody>

                                    </table>

                                </div>

                            </div>


                        </>

                    )
                }



                {/* TOAST */}

                {
                    toast && (

                        <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 z-50">

                            <div className="icon-circle-check text-green-400"></div>

                            {
                                toast
                            }

                        </div>

                    )
                }


            </div>

        </DashboardLayout>

    );

}



// ============================================================
// APP START
// ============================================================

const root =
    ReactDOM.createRoot(
        document.getElementById("root")
    );


root.render(

    <ErrorBoundary>

        <ReportsApp />

    </ErrorBoundary>

);