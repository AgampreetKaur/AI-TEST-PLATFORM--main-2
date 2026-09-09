class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  componentDidCatch(error) {
    console.error("Error:", error);
  }
  render() {
    return this.state.hasError
      ? <div className="p-8 text-red-500">Error loading page</div>
      : this.props.children;
  }
}

function formatDateTime(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function TestsApp() {
  try {
    const [tests, setTests] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [loadError, setLoadError] = React.useState("");
    const [toast, setToast] = React.useState(null);

    const [notifPermission, setNotifPermission] = React.useState(
      typeof Notification !== "undefined" ? Notification.permission : "unsupported"
    );

    // The active "taking a test" screen.
    const [activeTest, setActiveTest] = React.useState(null); // { id, title, subject, chapter, duration_minutes, total_questions, questions }
    const [answers, setAnswers] = React.useState([]);
    const [secondsLeft, setSecondsLeft] = React.useState(null);
    const [submitting, setSubmitting] = React.useState(false);

    const [result, setResult] = React.useState(null); // TestResultOut, shown after submit or "View result"

    const knownAvailableIds = React.useRef(new Set());

    const showToast = (msg) => {
      setToast(msg);
      setTimeout(() => setToast(null), 4500);
    };

    // --------------------------------------------------------
    // LOAD + POLL
    // --------------------------------------------------------

    const loadTests = async (isPoll = false) => {
      try {
        const list = await API.tests.listMine();
        setTests(list);
        setLoadError("");

        // Notify on any test that just became available since the last
        // check (skipped on the very first load so we don't notify for
        // things that were already unlocked before the page opened).
        if (isPoll && typeof Notification !== "undefined" && Notification.permission === "granted") {
          list.forEach((t) => {
            if (
              t.is_available &&
              t.status !== "completed" &&
              !knownAvailableIds.current.has(t.id)
            ) {
              const n = new Notification("Your test is ready!", {
                body: `"${t.title}" is now available — tap to start.`,
              });
              n.onclick = () => {
                window.focus();
                handleStart(t.id);
              };
            }
          });
        }

        knownAvailableIds.current = new Set(
          list.filter((t) => t.is_available && t.status !== "completed").map((t) => t.id)
        );
      } catch (error) {
        console.error("Load tests error:", error);
        setLoadError(error.message || "Could not load your tests.");
      } finally {
        setLoading(false);
      }
    };

    React.useEffect(() => {
      loadTests(false);

      const interval = setInterval(() => loadTests(true), 20000);
      return () => clearInterval(interval);
    }, []);

    // --------------------------------------------------------
    // NOTIFICATION PERMISSION
    // --------------------------------------------------------

    const requestNotifications = async () => {
      if (typeof Notification === "undefined") return;
      try {
        const perm = await Notification.requestPermission();
        setNotifPermission(perm);
      } catch (error) {
        console.error("Notification permission error:", error);
      }
    };

    // --------------------------------------------------------
    // TAKE TEST
    // --------------------------------------------------------

    const handleStart = async (testId) => {
      try {
        const take = await API.tests.take(testId);
        setActiveTest(take);
        setAnswers(new Array(take.questions.length).fill(-1));
        setSecondsLeft(take.duration_minutes ? take.duration_minutes * 60 : null);
        setResult(null);
      } catch (error) {
        console.error("Start test error:", error);
        showToast(error.message || "Could not start this test.");
        loadTests(false);
      }
    };

    // Countdown timer — auto-submits when it hits zero.
    React.useEffect(() => {
      if (secondsLeft === null || !activeTest) return;
      if (secondsLeft <= 0) {
        handleSubmit();
        return;
      }
      const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
      return () => clearTimeout(t);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [secondsLeft, activeTest]);

    const selectAnswer = (qIndex, optIndex) => {
      setAnswers((prev) => {
        const next = [...prev];
        next[qIndex] = optIndex;
        return next;
      });
    };

    const handleSubmit = async () => {
      if (!activeTest || submitting) return;
      setSubmitting(true);
      try {
        const res = await API.tests.submit(activeTest.id, answers);
        setResult(res);
        setActiveTest(null);
        setSecondsLeft(null);
        loadTests(false);
      } catch (error) {
        console.error("Submit test error:", error);
        showToast(error.message || "Could not submit this test.");
      } finally {
        setSubmitting(false);
      }
    };

    const handleViewResult = async (testId) => {
      try {
        const res = await API.tests.getResult(testId);
        setResult(res);
      } catch (error) {
        console.error("View result error:", error);
        showToast(error.message || "Could not load this test's result.");
      }
    };

    // --------------------------------------------------------
    // DERIVED LISTS
    // --------------------------------------------------------

    const available = tests.filter((t) => t.is_available && t.status !== "completed");
    const upcoming = tests.filter((t) => !t.is_available && t.status !== "completed");
    const completed = tests.filter((t) => t.status === "completed");

    const fmtTimer = (s) => {
      const m = Math.floor(s / 60);
      const sec = s % 60;
      return `${m}:${sec.toString().padStart(2, "0")}`;
    };

    // --------------------------------------------------------
    // RENDER: taking a test
    // --------------------------------------------------------

    if (activeTest) {
      return (
        <DashboardLayout title="My Tests">
          <div className="max-w-3xl mx-auto">
            <div className="card p-6 mb-6 flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{activeTest.title}</h2>
                <p className="text-sm text-gray-500">
                  {activeTest.subject}{activeTest.subject && activeTest.chapter ? " · " : ""}{activeTest.chapter}
                  {" · "}{activeTest.total_questions} question(s)
                </p>
              </div>
              {secondsLeft !== null && (
                <div className={`px-4 py-2 rounded-lg font-bold text-lg ${secondsLeft <= 30 ? "bg-red-100 text-red-600" : "bg-indigo-100 text-[var(--primary)]"}`}>
                  <div className="icon-timer inline-block mr-2"></div>
                  {fmtTimer(Math.max(0, secondsLeft))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              {activeTest.questions.map((q, qi) => (
                <div key={qi} className="card p-5">
                  <p className="font-semibold text-gray-900 mb-3">
                    {qi + 1}. {q.question}
                  </p>
                  <div className="space-y-2">
                    {q.options.map((opt, oi) => (
                      <label
                        key={oi}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          answers[qi] === oi
                            ? "border-[var(--primary)] bg-indigo-50"
                            : "border-[var(--border-color)] hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`q-${qi}`}
                          checked={answers[qi] === oi}
                          onChange={() => selectAnswer(qi, oi)}
                        />
                        <span className="text-sm text-gray-800">
                          {String.fromCharCode(65 + oi)}) {opt}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center mt-6 mb-10">
              <p className="text-sm text-gray-500">
                {answers.filter((a) => a !== -1).length} of {activeTest.questions.length} answered
              </p>
              <button className="btn-primary" onClick={handleSubmit} disabled={submitting}>
                {submitting ? <div className="icon-loader animate-spin"></div> : <div className="icon-send"></div>}
                {submitting ? "Submitting..." : "Submit test"}
              </button>
            </div>
          </div>
        </DashboardLayout>
      );
    }

    // --------------------------------------------------------
    // RENDER: a result screen
    // --------------------------------------------------------

    if (result) {
      const pct = result.max_score ? Math.round((result.score / result.max_score) * 100) : 0;
      return (
        <DashboardLayout title="My Tests">
          <div className="max-w-3xl mx-auto">
            <div className="card p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-1">{result.title}</h2>
              <p className="text-lg font-semibold text-[var(--primary)]">
                {result.score} / {result.max_score} ({pct}%)
              </p>
            </div>

            <div className="space-y-4">
              {result.results.map((r, i) => (
                <div
                  key={i}
                  className={`card p-5 border-l-4 ${r.is_correct ? "border-l-green-500" : "border-l-red-500"}`}
                >
                  <p className="font-semibold text-gray-900 mb-2">
                    {i + 1}. {r.question}
                  </p>
                  <div className="space-y-1 text-sm">
                    {r.options.map((opt, oi) => (
                      <div
                        key={oi}
                        className={
                          oi === r.correct_answer
                            ? "text-green-700 font-medium"
                            : oi === r.your_answer
                            ? "text-red-600"
                            : "text-gray-500"
                        }
                      >
                        {String.fromCharCode(65 + oi)}) {opt}
                        {oi === r.correct_answer ? " ✓ Correct answer" : ""}
                        {oi === r.your_answer && oi !== r.correct_answer ? " ✗ Your answer" : ""}
                      </div>
                    ))}
                  </div>
                  {r.explanation && (
                    <p className="text-xs text-gray-500 mt-3 bg-gray-50 p-2 rounded">{r.explanation}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 mb-10">
              <button className="btn-secondary" onClick={() => setResult(null)}>
                <div className="icon-arrow-left"></div>
                Back to My Tests
              </button>
            </div>
          </div>
        </DashboardLayout>
      );
    }

    // --------------------------------------------------------
    // RENDER: the list
    // --------------------------------------------------------

    return (
      <DashboardLayout title="My Tests">
        {notifPermission === "default" && (
          <div className="card p-4 mb-6 flex items-center justify-between flex-wrap gap-3 bg-indigo-50/50">
            <p className="text-sm text-gray-700">
              <div className="icon-bell inline-block mr-2 text-[var(--primary)]"></div>
              Turn on notifications so you know the moment a scheduled test unlocks.
            </p>
            <button className="btn-secondary text-sm py-1.5" onClick={requestNotifications}>
              Enable notifications
            </button>
          </div>
        )}

        {loading ? (
          <div className="card p-12 flex items-center justify-center text-gray-400">
            <div className="icon-loader animate-spin text-2xl"></div>
          </div>
        ) : loadError ? (
          <div className="card p-6 text-red-500 text-sm">{loadError}</div>
        ) : !tests.length ? (
          <div className="card p-12 flex flex-col items-center justify-center text-center text-gray-500">
            <div className="icon-calendar-clock text-5xl mb-4 text-gray-300"></div>
            <p className="font-medium text-gray-600">No tests yet</p>
            <p className="text-sm mt-2">Your parent hasn't scheduled any tests for you yet.</p>
          </div>
        ) : (
          <div className="space-y-8">

            {available.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <div className="icon-zap text-[var(--primary)]"></div>
                  Available now
                </h3>
                <div className="space-y-3">
                  {available.map((t) => (
                    <div key={t.id} className="card p-4 flex items-center justify-between flex-wrap gap-3">
                      <div>
                        <p className="font-medium text-gray-900">{t.title}</p>
                        <p className="text-xs text-gray-500">
                          {t.subject}{t.subject && t.chapter ? " · " : ""}{t.chapter} · {t.total_questions} question(s)
                          {t.duration_minutes ? ` · ${t.duration_minutes} min` : ""}
                        </p>
                      </div>
                      <button className="btn-primary text-sm py-1.5" onClick={() => handleStart(t.id)}>
                        <div className="icon-play"></div>
                        Start test
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {upcoming.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <div className="icon-clock text-gray-400"></div>
                  Upcoming
                </h3>
                <div className="space-y-3">
                  {upcoming.map((t) => (
                    <div key={t.id} className="card p-4 flex items-center justify-between flex-wrap gap-3 opacity-80">
                      <div>
                        <p className="font-medium text-gray-900">{t.title}</p>
                        <p className="text-xs text-gray-500">
                          {t.subject}{t.subject && t.chapter ? " · " : ""}{t.chapter} · {t.total_questions} question(s)
                        </p>
                      </div>
                      <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full font-medium">
                        Unlocks {formatDateTime(t.scheduled_at)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {completed.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <div className="icon-check-circle text-green-500"></div>
                  Completed
                </h3>
                <div className="space-y-3">
                  {completed.map((t) => {
                    const pct = t.max_score ? Math.round((t.score / t.max_score) * 100) : 0;
                    return (
                      <div key={t.id} className="card p-4 flex items-center justify-between flex-wrap gap-3">
                        <div>
                          <p className="font-medium text-gray-900">{t.title}</p>
                          <p className="text-xs text-gray-500">
                            {t.subject}{t.subject && t.chapter ? " · " : ""}{t.chapter}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full font-semibold">
                            {t.score}/{t.max_score} ({pct}%)
                          </span>
                          <button className="btn-secondary text-sm py-1.5" onClick={() => handleViewResult(t.id)}>
                            <div className="icon-eye"></div>
                            View result
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        )}

        {toast && (
          <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 z-50">
            <div className="icon-circle-alert text-yellow-400"></div>
            {toast}
          </div>
        )}
      </DashboardLayout>
    );
  } catch (error) {
    console.error("TestsApp error:", error);
    return null;
  }
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<ErrorBoundary><TestsApp /></ErrorBoundary>);
