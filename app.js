class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error(
      "ErrorBoundary caught an error:",
      error,
      errorInfo.componentStack
    );
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Something went wrong
            </h1>

            <button
              onClick={() => window.location.reload()}
              className="btn-primary mx-auto"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}


// =========================================================
// CONFIG
// =========================================================

const DEFAULT_BACKEND = "http://localhost:8000";


// =========================================================
// STUDENT SESSION
// =========================================================

function getStudentSession() {
  try {
    const studentId =
      localStorage.getItem("student_id");

    const accessToken =
      localStorage.getItem("student_access_token");

    const authUserRaw =
      localStorage.getItem("auth_user");

    let authUser = null;

    if (authUserRaw) {
      try {
        authUser = JSON.parse(authUserRaw);
      } catch (e) {
        console.warn(
          "Could not parse auth_user:",
          e
        );
      }
    }

    return {
      studentId,
      accessToken,
      authUser,
    };

  } catch (error) {
    console.error(
      "Failed to read student session:",
      error
    );

    return {
      studentId: null,
      accessToken: null,
      authUser: null,
    };
  }
}


// =========================================================
// APP
// =========================================================

function App() {

  const [
    backendUrl
  ] = React.useState(
    () =>
      localStorage.getItem(
        "grader_backend_url"
      ) || DEFAULT_BACKEND
  );


  const [
    loading,
    setLoading
  ] = React.useState(true);


  const [
    error,
    setError
  ] = React.useState(null);


  const [
    submissions,
    setSubmissions
  ] = React.useState([]);


  const [
    report,
    setReport
  ] = React.useState(null);


  const [
    trend,
    setTrend
  ] = React.useState(null);


  // =======================================================
  // SESSION
  // =======================================================

  const session = getStudentSession();

  const STUDENT_ID =
    session.studentId;

  const ACCESS_TOKEN =
    session.accessToken;

  const currentUser =
    session.authUser;


  const studentName =
    currentUser?.Name ||
    currentUser?.name ||
    "there";


  // =======================================================
  // AUTH CHECK
  // =======================================================

  React.useEffect(() => {

    if (!STUDENT_ID || !ACCESS_TOKEN) {

      console.warn(
        "Student session not found."
      );

      window.location.href =
        "student-login.html";

      return;
    }

  }, [STUDENT_ID, ACCESS_TOKEN]);


  // =======================================================
  // API HELPER
  // =======================================================

  const api = async (
    path,
    options = {}
  ) => {

    const headers = {
      Accept: "application/json",

      ...(options.headers || {}),
    };


    // Student JWT
    if (ACCESS_TOKEN) {

      headers.Authorization =
        `Bearer ${ACCESS_TOKEN}`;

    }


    const response =
      await fetch(
        backendUrl.replace(/\/$/, "") + path,
        {
          ...options,
          headers,
        }
      );


    if (!response.ok) {

      let detail =
        response.statusText ||
        `Request failed (${response.status})`;


      try {

        const data =
          await response.json();

        detail =
          data.detail ||
          detail;

      } catch (e) {
        // Response was not JSON.
      }


      throw new Error(
        typeof detail === "string"
          ? detail
          : JSON.stringify(detail)
      );
    }


    return response.json();
  };


  // =======================================================
  // LOAD STUDENT DATA
  // =======================================================

  React.useEffect(() => {

    let cancelled = false;


    async function loadDashboard() {

      if (
        !STUDENT_ID ||
        !ACCESS_TOKEN
      ) {
        return;
      }


      setLoading(true);
      setError(null);


      try {

        // -------------------------------------------------
        // CURRENT BACKEND ENDPOINT
        // -------------------------------------------------
        //
        // OLD:
        // /submissions?student_id=...
        //
        // NEW:
        // /submissions/student/{student_id}
        //

        const subs =
          await api(
            `/submissions/student/${encodeURIComponent(
              STUDENT_ID
            )}`
          );


        if (cancelled) {
          return;
        }


        setSubmissions(
          Array.isArray(subs)
            ? subs
            : []
        );


        // -------------------------------------------------
        // Reports
        // -------------------------------------------------
        //
        // The current backend does not expose:
        //
        // /submissions/report
        // /submissions/report/timeseries
        //
        // Therefore don't call those old endpoints.
        //
        // Dashboard report information is derived from
        // the submissions returned above.
        //

        const graded =
          (Array.isArray(subs)
            ? subs
            : []
          ).filter(
            (s) =>
              String(s.status).toLowerCase()
              === "graded"
          );


        // -------------------------------------------------
        // SUBJECT SUMMARY
        // -------------------------------------------------

        const subjectMap = {};


        graded.forEach(
          (submission) => {

            const subject =
              submission.subject ||
              "General";


            if (!subjectMap[subject]) {

              subjectMap[subject] = {
                subject,
                totalPct: 0,
                count: 0,
              };

            }


            // Try common result fields.
            let percentage = null;


            if (
              submission.total_score != null &&
              submission.total_max_score != null &&
              Number(
                submission.total_max_score
              ) > 0
            ) {

              percentage =
                (
                  Number(
                    submission.total_score
                  ) /
                  Number(
                    submission.total_max_score
                  )
                ) * 100;

            }


            if (
              percentage == null &&
              submission.score != null &&
              submission.max_score != null &&
              Number(
                submission.max_score
              ) > 0
            ) {

              percentage =
                (
                  Number(
                    submission.score
                  ) /
                  Number(
                    submission.max_score
                  )
                ) * 100;

            }


            if (percentage != null) {

              subjectMap[subject].totalPct +=
                percentage;

              subjectMap[subject].count += 1;

            }

          }
        );


        const subjects =
          Object.values(
            subjectMap
          ).map(
            (item) => ({
              subject: item.subject,

              average_pct:
                item.count
                  ? Math.round(
                      item.totalPct /
                      item.count
                    )
                  : 0,

              count:
                item.count,
            })
          );


        const reportData = {
          subjects,
        };


        // -------------------------------------------------
        // OVERALL TREND
        // -------------------------------------------------

        const aggregate =
          graded
            .map(
              (submission) => {

                let percentage = null;


                if (
                  submission.total_score != null &&
                  submission.total_max_score != null &&
                  Number(
                    submission.total_max_score
                  ) > 0
                ) {

                  percentage =
                    (
                      Number(
                        submission.total_score
                      ) /
                      Number(
                        submission.total_max_score
                      )
                    ) * 100;

                }


                return {
                  submission,
                  percentage,
                };

              }
            )
            .filter(
              (item) =>
                item.percentage != null
            )
            .map(
              (item) => {

                const date =
                  item.submission.created_at
                    ? new Date(
                        item.submission.created_at
                      )
                    : new Date();


                return {
                  label:
                    date.toLocaleDateString(
                      undefined,
                      {
                        day: "numeric",
                        month: "short",
                      }
                    ),

                  average_pct:
                    Math.round(
                      item.percentage
                    ),

                  date,
                };

              }
            )
            .sort(
              (a, b) =>
                a.date - b.date
            );


        if (!cancelled) {

          setReport(
            reportData
          );

          setTrend({
            aggregate,
          });

        }

      } catch (e) {

        console.error(
          "Dashboard load error:",
          e
        );


        if (!cancelled) {

          setError(
            /Failed to fetch|NetworkError|fetch/i.test(
              e.message
            )
              ? `Can't reach the grader backend at ${backendUrl}. Make sure it's running.`
              : e.message
          );

        }

      } finally {

        if (!cancelled) {

          setLoading(false);

        }

      }

    }


    loadDashboard();


    return () => {

      cancelled = true;

    };

  }, [
    backendUrl,
    STUDENT_ID,
    ACCESS_TOKEN,
  ]);


  // =======================================================
  // DERIVED STATS
  // =======================================================

  const gradedSubs =
    submissions.filter(
      (s) =>
        String(s.status).toLowerCase()
        === "graded"
    );


  const pendingSubs =
    submissions.filter(
      (s) => {

        const status =
          String(
            s.status || ""
          ).toLowerCase();


        return (
          status !== "graded" &&
          status !== "failed"
        );

      }
    );


  const overallAvg =
    report &&
    Array.isArray(report.subjects) &&
    report.subjects.length
      ? Math.round(
          report.subjects.reduce(
            (sum, subject) =>
              sum +
              (
                Number(
                  subject.average_pct
                ) *
                Number(
                  subject.count
                )
              ),
            0
          ) /
          report.subjects.reduce(
            (sum, subject) =>
              sum +
              Number(
                subject.count
              ),
            0
          )
        )
      : null;


  const weakestSubject =
    report &&
    Array.isArray(report.subjects) &&
    report.subjects.length
      ? [
          ...report.subjects,
        ].sort(
          (a, b) =>
            a.average_pct -
            b.average_pct
        )[0]
      : null;


  // =======================================================
  // DASHBOARD STATS
  // =======================================================

  const stats = [

    {
      title: "Homework Uploaded",
      value:
        String(
          submissions.length
        ),
      icon: "file-text",
      colorClass:
        "text-blue-600",
      bgClass:
        "bg-blue-50",
    },

    {
      title: "Graded So Far",
      value:
        String(
          gradedSubs.length
        ),
      icon: "clipboard-check",
      colorClass:
        "text-emerald-600",
      bgClass:
        "bg-emerald-50",
    },

    {
      title: "Overall Average",
      value:
        overallAvg != null
          ? `${overallAvg}%`
          : "—",
      icon: "percent",
      colorClass:
        "text-indigo-600",
      bgClass:
        "bg-indigo-50",
    },

    {
      title: "Awaiting Grading",
      value:
        String(
          pendingSubs.length
        ),
      icon: "clock",
      colorClass:
        "text-amber-600",
      bgClass:
        "bg-amber-50",
    },

  ];


  // =======================================================
  // TREND CHART
  // =======================================================

  const trendChartData =
    trend &&
    Array.isArray(
      trend.aggregate
    ) &&
    trend.aggregate.length > 0
      ? {
          labels:
            trend.aggregate.map(
              (point) =>
                point.label
            ),

          datasets: [

            {
              label:
                "Average Score (%)",

              data:
                trend.aggregate.map(
                  (point) =>
                    point.average_pct
                ),

              borderColor:
                "#4f46e5",

              backgroundColor:
                "rgba(79, 70, 229, 0.1)",

              fill: true,

              tension: 0.4,
            },

          ],
        }
      : null;


  // =======================================================
  // SUBJECT CHART
  // =======================================================

  const subjectChartData =
    report &&
    Array.isArray(
      report.subjects
    ) &&
    report.subjects.length > 0
      ? {
          labels:
            report.subjects.map(
              (subject) =>
                subject.subject
            ),

          datasets: [

            {
              label:
                "Average Score (%)",

              data:
                report.subjects.map(
                  (subject) =>
                    subject.average_pct
                ),

              backgroundColor: [
                "#4f46e5",
                "#3b82f6",
                "#10b981",
                "#f59e0b",
                "#ec4899",
                "#8b5cf6",
              ],

              borderRadius: 4,
            },

          ],
        }
      : null;


  // =======================================================
  // RENDER
  // =======================================================

  return (

    <DashboardLayout
      title="Dashboard Overview"
    >

      <div className="space-y-6">

        {/* Welcome Section */}

        <div className="flex justify-between items-center flex-wrap gap-3">

          <div>

            <h2 className="text-2xl font-bold text-gray-900">

              Welcome back,{" "}
              {studentName}! 👋

            </h2>


            <p className="text-gray-500 mt-1">

              {weakestSubject

                ? `Your weakest subject right now is ${weakestSubject.subject} (${weakestSubject.average_pct}%) — worth a look.`

                : "Here's a look at your homework and progress."}

            </p>

          </div>


          <button
            className="btn-primary"
            onClick={() =>
              window.location.href =
                "validation.html"
            }
          >

            <div className="icon-upload"></div>

            Upload Homework

          </button>

        </div>


        {/* Quick Actions */}

        <div className="card p-6 bg-indigo-50 border-indigo-100">

          <h3 className="text-lg font-bold text-indigo-900 mb-4 flex items-center gap-2">

            <div className="icon-circle-play text-indigo-600"></div>

            What would you like to do?

          </h3>


          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">

            <div className="hidden md:block absolute top-1/2 left-8 right-8 h-0.5 bg-indigo-200 -z-0 -translate-y-1/2"></div>


            {/* Upload */}

            <div
              className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm relative z-10 flex flex-col items-center text-center group hover:border-[var(--primary)] transition-colors cursor-pointer"
              onClick={() =>
                window.location.href =
                  "validation.html"
              }
            >

              <div className="w-10 h-10 bg-indigo-100 text-[var(--primary)] rounded-full flex items-center justify-center font-bold mb-3 group-hover:bg-[var(--primary)] group-hover:text-white transition-colors">

                1

              </div>


              <div className="icon-cloud-upload text-2xl text-gray-400 mb-2 group-hover:text-[var(--primary)]"></div>


              <h4 className="font-semibold text-gray-900">

                Upload Homework

              </h4>


              <p className="text-xs text-gray-500 mt-1">

                Get it graded with AI feedback

              </p>

            </div>


            {/* Practice */}

            <div
              className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm relative z-10 flex flex-col items-center text-center group hover:border-[var(--primary)] transition-colors cursor-pointer"
              onClick={() =>
                window.location.href =
                  "generator.html"
              }
            >

              <div className="w-10 h-10 bg-indigo-100 text-[var(--primary)] rounded-full flex items-center justify-center font-bold mb-3 group-hover:bg-[var(--primary)] group-hover:text-white transition-colors">

                2

              </div>


              <div className="icon-file-text text-2xl text-gray-400 mb-2 group-hover:text-[var(--primary)]"></div>


              <h4 className="font-semibold text-gray-900">

                Practice a Test

              </h4>


              <p className="text-xs text-gray-500 mt-1">

                Generate a practice paper

              </p>

            </div>


            {/* AI Tutor */}

            <div
              className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm relative z-10 flex flex-col items-center text-center group hover:border-[var(--primary)] transition-colors cursor-pointer"
              onClick={() =>
                window.location.href =
                  "chatbot.html"
              }
            >

              <div className="w-10 h-10 bg-indigo-100 text-[var(--primary)] rounded-full flex items-center justify-center font-bold mb-3 group-hover:bg-[var(--primary)] group-hover:text-white transition-colors">

                3

              </div>


              <div className="icon-bot text-2xl text-gray-400 mb-2 group-hover:text-[var(--primary)]"></div>


              <h4 className="font-semibold text-gray-900">

                Ask the AI Tutor

              </h4>


              <p className="text-xs text-gray-500 mt-1">

                Get help on a chapter

              </p>

            </div>


            {/* Reports */}

            <div
              className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm relative z-10 flex flex-col items-center text-center group hover:border-[var(--primary)] transition-colors cursor-pointer"
              onClick={() =>
                window.location.href =
                  "reports.html"
              }
            >

              <div className="w-10 h-10 bg-indigo-100 text-[var(--primary)] rounded-full flex items-center justify-center font-bold mb-3 group-hover:bg-[var(--primary)] group-hover:text-white transition-colors">

                4

              </div>


              <div className="icon-chart-bar text-2xl text-gray-400 mb-2 group-hover:text-[var(--primary)]"></div>


              <h4 className="font-semibold text-gray-900">

                View My Reports

              </h4>


              <p className="text-xs text-gray-500 mt-1">

                See progress and weak topics

              </p>

            </div>

          </div>

        </div>


        {/* Loading */}

        {loading && (

          <div className="card p-10 text-center text-gray-400">

            <div className="icon-loader animate-spin text-2xl mb-2"></div>

            Loading your dashboard…

          </div>

        )}


        {/* Error */}

        {!loading &&
          error && (

            <div className="card p-6 bg-red-50 border-red-100 text-red-700 text-sm">

              {error}

            </div>

          )}


        {/* Data */}

        {!loading &&
          !error && (

            <>

              {/* Stats */}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                {stats.map(
                  (stat, index) => (

                    <StatCard
                      key={index}
                      {...stat}
                    />

                  )
                )}

              </div>


              {/* Empty State */}

              {submissions.length === 0 ? (

                <div className="card p-10 text-center text-gray-500">

                  You haven't uploaded any homework yet — click{" "}

                  <b>
                    Upload Homework
                  </b>

                  {" "}
                  above to get started.

                </div>

              ) : (

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                  {/* Trend */}

                  <div className="card p-6">

                    <h3 className="text-lg font-semibold text-gray-900 mb-4">

                      My Score Trend

                    </h3>


                    {trendChartData ? (

                      <CustomChart
                        type="line"
                        data={trendChartData}
                        options={{
                          scales: {
                            y: {
                              min: 0,
                              max: 100,
                            },
                          },
                        }}
                      />

                    ) : (

                      <p className="text-sm text-gray-400 text-center py-16">

                        Not enough graded work yet to show a trend.

                      </p>

                    )}

                  </div>


                  {/* Subject */}

                  <div className="card p-6">

                    <h3 className="text-lg font-semibold text-gray-900 mb-4">

                      My Average by Subject

                    </h3>


                    {subjectChartData ? (

                      <CustomChart
                        type="bar"
                        data={subjectChartData}
                      />

                    ) : (

                      <p className="text-sm text-gray-400 text-center py-16">

                        Not enough graded work yet by subject.

                      </p>

                    )}

                  </div>

                </div>

              )}

            </>

          )}

      </div>

    </DashboardLayout>

  );
}


// =========================================================
// RENDER
// =========================================================

const root =
  ReactDOM.createRoot(
    document.getElementById("root")
  );


root.render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);