// Homework Validation page — wired to the standalone `homework-grader` backend.
// Flow: upload image -> Gemini OCR (+ auto-extracted questions if embedded) ->
// review extracted text/questions -> approve -> Gemini grades against the
// rubric -> structured per-question result. Also shows a filterable history
// of past submissions below the upload form.
//
// Student authentication:
// - Student logs in through student-login-app.js
// - student_access_token is stored in localStorage
// - This file attaches that JWT to backend requests.
//
// NOTE: The backend must have CORS enabled.

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
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


const DEFAULT_BACKEND = "http://localhost:8000";


// Student ID saved during Student Login.
const STUDENT_ID =
  localStorage.getItem("student_id") || "";

const sleep = (ms) =>
  new Promise((r) => setTimeout(r, ms));

const todayISO = () =>
  new Date().toISOString().slice(0, 10);

const fmtDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString(
        undefined,
        {
          day: "numeric",
          month: "short",
          year: "numeric"
        }
      )
    : "—";


// Common school subjects.
const SUBJECT_OPTIONS = [
  "Mathematics",
  "Science",
  "Physics",
  "Chemistry",
  "Biology",
  "English",
  "Hindi",
  "Social Science",
  "History",
  "Geography",
  "Civics",
  "Computer Science",
  "Sanskrit",
];


function ValidationApp() {

  const generatedPapers =
    JSON.parse(
      localStorage.getItem("generated_papers") || "[]"
    );


  const [backendUrl, setBackendUrl] =
    React.useState(
      () =>
        localStorage.getItem("grader_backend_url") ||
        DEFAULT_BACKEND
    );


  // ---------------------------------------------------------
  // Upload form
  // ---------------------------------------------------------

  const [subject, setSubject] =
    React.useState("");

  const [subjectIsOther, setSubjectIsOther] =
    React.useState(false);

  const [hwDate, setHwDate] =
    React.useState(todayISO());

  const [isOwnHomework, setIsOwnHomework] =
    React.useState(true);

  const [selectedPaperId, setSelectedPaperId] =
    React.useState(
      generatedPapers[0]?.id || ""
    );

  const [questionSource, setQuestionSource] =
    React.useState("embedded");

  const [rubric, setRubric] =
    React.useState("");

  const [maxMarks, setMaxMarks] =
    React.useState(10);


  // ---------------------------------------------------------
  // Generated test answer key
  // ---------------------------------------------------------

  React.useEffect(() => {

    if (isOwnHomework) {
      return;
    }

    const paper =
      generatedPapers.find(
        (p) =>
          String(p.id) ===
          String(selectedPaperId)
      );

  if (paper) {
    if (paper.subject) {
        setSubject(paper.subject.trim());
        setSubjectIsOther(false);
    }

    if (paper.answers) {
        setRubric(paper.answers);
        setQuestionSource("separate");
    }
}

  }, [isOwnHomework, selectedPaperId]);


  // ---------------------------------------------------------
  // Files
  // ---------------------------------------------------------

  const [files, setFiles] =
    React.useState([]);

  const [previews, setPreviews] =
    React.useState([]);

  const fileInputRef =
    React.useRef(null);


  // ---------------------------------------------------------
  // Validation state
  // ---------------------------------------------------------

  const [step, setStep] =
    React.useState(0);

  const [busy, setBusy] =
    React.useState(false);

  const [statusText, setStatusText] =
    React.useState("");

  const [submissionId, setSubmissionId] =
    React.useState(null);

  const [pages, setPages] =
    React.useState([]);

  const [questions, setQuestions] =
    React.useState([]);

  const [result, setResult] =
    React.useState(null);

  const [toast, setToast] =
    React.useState(null);


  // ---------------------------------------------------------
  // History
  // ---------------------------------------------------------

  const [history, setHistory] =
    React.useState([]);

  const [historyLoading, setHistoryLoading] =
    React.useState(false);

  const [fromDate, setFromDate] =
    React.useState("");

  const [toDate, setToDate] =
    React.useState("");

  const [viewSubmission, setViewSubmission] =
    React.useState(null);


  const showToast = (message) => {

    setToast(message);

    setTimeout(
      () => setToast(null),
      3500
    );

  };


  const errMsg = (e) => {

    const message =
      (e && e.message) ||
      "Something went wrong.";

    if (
      /Failed to fetch|NetworkError|load failed/i.test(
        message
      )
    ) {

      return (
        "Can't reach the grader backend at " +
        backendUrl +
        ". Make sure it's running and CORS is enabled."
      );

    }

    return message;
  };


  // =========================================================
  // AUTHENTICATED API HELPER
  // =========================================================
  //
  // Student login stores:
  //
  // localStorage.student_access_token
  //
  // We attach it to every homework request.
  // =========================================================

  const api = async (path, opts = {}) => {

    const token =
      localStorage.getItem(
        "student_access_token"
      );


    const headers =
      new Headers(
        opts.headers || {}
      );


    if (token) {

      headers.set(
        "Authorization",
        `Bearer ${token}`
      );

    }


    const res =
      await fetch(
        backendUrl.replace(/\/$/, "") + path,
        {
          ...opts,
          headers,
        }
      );


    let data = null;

    try {

      data = await res.json();

    } catch (e) {
      // Response may not contain JSON.
    }


    if (!res.ok) {

      const detail =
        (data &&
          (data.detail || data.message)) ||
        res.statusText;


      throw new Error(
        typeof detail === "string"
          ? detail
          : JSON.stringify(detail)
      );

    }


    return data;
  };


  const onBackendChange = (value) => {

    setBackendUrl(value);

    localStorage.setItem(
      "grader_backend_url",
      value
    );

  };


  // =========================================================
  // FILE HANDLING
  // =========================================================

  const onPickFiles = (fileList) => {

    const picked =
      Array.from(fileList || []);


    if (!picked.length) {
      return;
    }


    setFiles((previous) => {

      const existingKeys =
        new Set(
          previous.map(
            (file) =>
              file.name + file.size
          )
        );


      const toAdd =
        picked.filter(
          (file) =>
            !existingKeys.has(
              file.name + file.size
            )
        );


      return [
        ...previous,
        ...toAdd
      ];

    });


    setPreviews((previous) => [

      ...previous,

      ...picked.map(
        (file) =>
          URL.createObjectURL(file)
      )

    ]);

  };


  const removeFile = (index) => {

    setFiles(
      (previous) =>
        previous.filter(
          (_, i) => i !== index
        )
    );


    setPreviews(
      (previous) => {

        URL.revokeObjectURL(
          previous[index]
        );


        return previous.filter(
          (_, i) => i !== index
        );

      }
    );

  };


  // =========================================================
  // HISTORY
  // =========================================================

  const loadHistory =
    React.useCallback(
      async () => {

        if (!STUDENT_ID) {

          console.warn(
            "No student ID found in localStorage."
          );

          setHistory([]);

          return;
        }


        setHistoryLoading(true);


        try {

          /*
           * IMPORTANT:
           *
           * Backend endpoint is:
           *
           * GET /submissions/student/{student_id}
           *
           * NOT:
           *
           * GET /submissions?student_id=...
           */

          const rows =
            await api(
              `/submissions/student/${encodeURIComponent(
                STUDENT_ID
              )}`
            );


          /*
           * Keep the existing UI working.
           *
           * Date filtering is applied locally because
           * the current backend endpoint does not expose
           * from_date / to_date query parameters.
           */

          let filteredRows =
            Array.isArray(rows)
              ? rows
              : [];


          if (fromDate) {

            filteredRows =
              filteredRows.filter(
                (row) => {

                  if (!row.submission_date) {
                    return true;
                  }

                  return (
                    row.submission_date >=
                    fromDate
                  );

                }
              );

          }


          if (toDate) {

            filteredRows =
              filteredRows.filter(
                (row) => {

                  if (!row.submission_date) {
                    return true;
                  }

                  return (
                    row.submission_date <=
                    toDate
                  );

                }
              );

          }


          setHistory(
            filteredRows
          );


        } catch (e) {

          console.error(
            "History load error:",
            e
          );

          /*
           * Do not show a toast for background
           * history failures.
           */

        } finally {

          setHistoryLoading(false);

        }

      },
      [
        backendUrl,
        fromDate,
        toDate,
      ]
    );


  React.useEffect(
    () => {

      loadHistory();

    },
    [loadHistory]
  );


  // =========================================================
  // START VALIDATION
  // =========================================================

  const startValidation = async () => {

    if (!STUDENT_ID) {

      showToast(
        "Student session not found. Please login again."
      );

      return;
    }


    if (!files.length) {

      showToast(
        "Please choose at least one notebook photo first."
      );

      return;
    }


    if (
      questionSource !== "embedded" &&
      !rubric.trim()
    ) {

      showToast(
        isOwnHomework
          ? 'Add an answer key / rubric, or switch Question source to "Detect from scan".'
          : "The selected test has no answer key saved on this device — pick a different test or check \"my own homework\"."
      );

      return;
    }


    setBusy(true);

    setStatusText(
      "Uploading and extracting text with AI…"
    );


    try {

      const fd =
        new FormData();


      fd.append(
        "student_id",
        STUDENT_ID
      );


      if (!subject.trim()) {
    showToast("Please select a subject before uploading homework.");
    setBusy(false);
    setStatusText("");
    return;
}

fd.append("subject", subject.trim());


      fd.append(
        "question_source",
        questionSource
      );


      /*
       * Existing backend may or may not consume
       * these extra fields. They are preserved.
       */

      fd.append(
        "submission_date",
        hwDate
      );


      fd.append(
        "linked_paper_id",
        isOwnHomework
          ? ""
          : String(
              selectedPaperId || ""
            )
      );


      files.forEach(
        (file) =>
          fd.append(
            "files",
            file
          )
      );


      const sub =
        await api(
          "/submissions",
          {
            method: "POST",
            body: fd,
          }
        );


      setSubmissionId(
        sub.id
      );


      // -----------------------------------------------------
      // Attach rubric / answer key
      // -----------------------------------------------------

      if (
        questionSource !== "embedded" &&
        rubric.trim()
      ) {

        await api(
          `/submissions/${sub.id}/questions`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({

              questions: [

                {
                  question_number: "1",

                  question_text:
                    "Grade the student's handwritten answers against the provided answer key.",

                  max_marks:
                    Number(maxMarks) || 10,

                  rubric:
                    rubric,
                }

              ]

            }),

          }
        );

      }


      // -----------------------------------------------------
      // Poll OCR
      // -----------------------------------------------------

      let sub2 = null;


      for (
        let i = 0;
        i < 90;
        i++
      ) {

        sub2 =
          await api(
            `/submissions/${sub.id}`
          );


        setStatusText(
          "Extracting text… (" +
          sub2.status +
          ")"
        );


        if (
          sub2.status ===
          "pending_approval"
        ) {

          break;

        }


        if (
          sub2.status ===
          "failed"
        ) {

          throw new Error(
            sub2.failure_reason ||
            "Extraction failed"
          );

        }


        await sleep(2000);

      }


      if (
        !sub2 ||
        sub2.status !==
          "pending_approval"
      ) {

        throw new Error(
          "Timed out waiting for OCR."
        );

      }


      setPages(
        sub2.pages
      );

      setQuestions(
        sub2.questions || []
      );

      setStep(1);


      showToast(
        "Text extracted — review it, then approve."
      );


    } catch (e) {

      console.error(e);

      showToast(
        errMsg(e)
      );


    } finally {

      setBusy(false);

      setStatusText("");

    }

  };


  // =========================================================
  // POLLING
  // =========================================================

  const pollUntil =
    async (
      targetStatus,
      label
    ) => {

      let sub = null;


      for (
        let i = 0;
        i < 90;
        i++
      ) {

        sub =
          await api(
            `/submissions/${submissionId}`
          );


        setStatusText(
          label +
          " (" +
          sub.status +
          ")"
        );


        if (
          sub.status ===
          targetStatus
        ) {

          return sub;

        }


        if (
          sub.status ===
          "failed"
        ) {

          throw new Error(
            sub.failure_reason ||
            (label + " failed")
          );

        }


        await sleep(2000);

      }


      throw new Error(
        "Timed out waiting for: " +
        targetStatus
      );

    };


  // =========================================================
  // RESCAN
  // =========================================================

  const rescanPage =
    async (pageId) => {

      setBusy(true);

      setStatusText(
        "Rescanning…"
      );


      try {

        await api(
          `/submissions/${submissionId}/rescan`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              page_ids: [pageId],
            }),

          }
        );


        const sub =
          await pollUntil(
            "pending_approval",
            "Rescanning…"
          );


        setPages(
          sub.pages
        );

        setQuestions(
          sub.questions || []
        );


        showToast(
          "Rescan complete."
        );


      } catch (e) {

        console.error(e);

        showToast(
          errMsg(e)
        );


      } finally {

        setBusy(false);

        setStatusText("");

      }

    };


  // =========================================================
  // APPROVE + GRADE
  // =========================================================

  const approveAndGrade =
    async () => {

      if (!questions.length) {

        showToast(
          "No questions on this submission yet — nothing to grade against."
        );

        return;
      }


      setBusy(true);

      setStatusText(
        "Grading with AI…"
      );


      try {

        const sub =
          await api(
            `/submissions/${submissionId}`
          );


        const ids =
          sub.pages.map(
            (p) => p.id
          );


        await api(
          `/submissions/${submissionId}/approve`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              page_ids: ids,
            }),

          }
        );


        await pollUntil(
          "graded",
          "Grading…"
        );


        const r =
          await api(
            `/submissions/${submissionId}/result`
          );


        setResult(r);

        setStep(2);


        await loadHistory();


        showToast(
          "Grading complete."
        );


      } catch (e) {

        console.error(e);

        showToast(
          errMsg(e)
        );


      } finally {

        setBusy(false);

        setStatusText("");

      }

    };


  // =========================================================
  // RESET
  // =========================================================

  const reset = () => {

    previews.forEach(
      (url) =>
        URL.revokeObjectURL(url)
    );


    setFiles([]);

    setPreviews([]);

    setSubmissionId(null);

    setPages([]);

    setQuestions([]);

    setResult(null);

    setStep(0);

    setSubject("");

    setSubjectIsOther(false);

    setHwDate(
      todayISO()
    );

    setRubric("");

  };


  // =========================================================
  // VIEW OLD SUBMISSION
  // =========================================================

  const openView =
    async (row) => {

      if (
        row.status !==
        "graded"
      ) {

        showToast(
          `This submission is currently "${row.status}" — nothing to view yet.`
        );

        return;
      }


      try {

        const [
          r,
          sub
        ] =
          await Promise.all([

            api(
              `/submissions/${row.id}/result`
            ),

            api(
              `/submissions/${row.id}`
            ),

          ]);


        setViewSubmission({
          row,
          result: r,
          pages:
            sub.pages || [],
        });


      } catch (e) {

        showToast(
          errMsg(e)
        );

      }

    };


  const pct =
    result &&
    result.total_max_score
      ? Math.round(
          (
            result.total_score /
            result.total_max_score
          ) * 100
        )
      : 0;


  // =========================================================
  // UI
  // =========================================================

  return (
    <DashboardLayout title="Homework Validation">

      {/* =====================================================
          STEP 0
      ===================================================== */}

      {step === 0 && (

        <div className="space-y-6">

          <div className="card p-6 space-y-4">

            <div>

              <label className="block text-sm font-medium mb-2">
                Grader backend URL
              </label>

              <input
                className="input-field"
                value={backendUrl}
                onChange={(e) =>
                  onBackendChange(
                    e.target.value
                  )
                }
                placeholder={
                  DEFAULT_BACKEND
                }
              />

            </div>


            <div
              className="row"
              style={{
                display: "grid",
                gridTemplateColumns:
                  "1fr 1fr",
                gap: "1rem",
              }}
            >

              <div>

                <label className="block text-sm font-medium mb-2">
                  Subject
                </label>

                <select
                  className="input-field"
                  value={
                    subjectIsOther
                      ? "__other__"
                      : subject
                  }
                  onChange={(e) => {

                    if (
                      e.target.value ===
                      "__other__"
                    ) {

                      setSubjectIsOther(
                        true
                      );

                      setSubject("");

                    } else {

                      setSubjectIsOther(
                        false
                      );

                      setSubject(
                        e.target.value
                      );

                    }

                  }}
                >

                  <option value="">
                    Select a subject...
                  </option>

                  {SUBJECT_OPTIONS.map(
                    (s) => (
                      <option
                        key={s}
                        value={s}
                      >
                        {s}
                      </option>
                    )
                  )}

                  <option value="__other__">
                    Other...
                  </option>

                </select>


                {subjectIsOther && (

                  <input
                    className="input-field mt-2"
                    value={subject}
                    onChange={(e) =>
                      setSubject(
                        e.target.value
                      )
                    }
                    placeholder="Type the subject name"
                    autoFocus
                  />

                )}

              </div>


              <div>

                <label className="block text-sm font-medium mb-2">
                  Date
                </label>

                <input
                  type="date"
                  className="input-field"
                  value={hwDate}
                  onChange={(e) =>
                    setHwDate(
                      e.target.value
                    )
                  }
                />

              </div>

            </div>


            <div>

              <label className="block text-sm font-medium mb-2">
                Is this from a generated test?
              </label>


              <div className="flex items-center gap-4 mb-2">

                <label className="flex items-center gap-2 text-sm">

                  <input
                    type="checkbox"
                    checked={
                      isOwnHomework
                    }
                    onChange={(e) =>
                      setIsOwnHomework(
                        e.target.checked
                      )
                    }
                  />

                  This is my own homework
                  (not tied to a generated test)

                </label>

              </div>


              {!isOwnHomework && (

                generatedPapers.length > 0 ? (

                  <select
                    className="input-field"
                    value={
                      selectedPaperId
                    }
                    onChange={(e) =>
                      setSelectedPaperId(
                        e.target.value
                      )
                    }
                  >

                    {generatedPapers.map(
                      (paper) => (

                        <option
                          key={paper.id}
                          value={paper.id}
                        >

                          {paper.subject}
                          {" | "}
                          {paper.chapter}
                          {" | "}
                          {paper.set}

                        </option>

                      )
                    )}

                  </select>

                ) : (

                  <p className="text-xs text-gray-500">

                    No generated papers found —
                    uncheck the box above to submit
                    as your own homework.

                  </p>

                )

              )}

            </div>


            <div>

              <label className="block text-sm font-medium mb-2">
                Question source
              </label>


              {isOwnHomework ? (

                <>

                  <select
                    className="input-field"
                    value={
                      questionSource
                    }
                    onChange={(e) =>
                      setQuestionSource(
                        e.target.value
                      )
                    }
                  >

                    <option value="embedded">
                      Detect questions from the scan automatically
                    </option>

                    <option value="separate">
                      I'll provide the answer key / rubric myself
                    </option>

                    <option value="both">
                      Both — detect from scan AND use my rubric
                    </option>

                  </select>


                  <p className="text-xs text-gray-500 mt-1">

                    "Detect from scan" reads the
                    questions straight off your
                    photo/PDF — no typing needed.

                  </p>

                </>

              ) : (

                <p className="text-sm text-gray-600 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">

                  Using{" "}

                  <b>
                    {
                      generatedPapers.find(
                        (p) =>
                          String(p.id) ===
                          String(
                            selectedPaperId
                          )
                      )?.set ||
                      "the selected test"
                    }
                  </b>

                  's own answer key automatically —
                  no need to detect or type it.

                </p>

              )}

            </div>


            {(questionSource !== "embedded" ||
              !isOwnHomework) && (

              <>

                <div>

                  <label className="block text-sm font-medium mb-2">

                    Answer key / rubric to grade against
                    {!isOwnHomework &&
                      " (auto-filled from the selected test — edit if needed)"}

                  </label>


                  <textarea
                    className="input-field h-32 font-mono text-sm"
                    value={rubric}
                    onChange={(e) =>
                      setRubric(
                        e.target.value
                      )
                    }
                    placeholder="Paste the answer key or grading rubric here"
                  />

                </div>


                <div className="w-40">

                  <label className="block text-sm font-medium mb-2">
                    Max marks
                  </label>

                  <input
                    type="number"
                    min="1"
                    className="input-field"
                    value={maxMarks}
                    onChange={(e) =>
                      setMaxMarks(
                        e.target.value
                      )
                    }
                  />

                </div>

              </>

            )}

          </div>


          {/* Upload */}

          <div className="card p-8 text-center">

            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              multiple
              ref={fileInputRef}
              className="hidden"
              onChange={(e) => {

                onPickFiles(
                  e.target.files
                );

                e.target.value = "";

              }}
            />


            <div
              className={`border-2 border-dashed ${
                busy
                  ? "border-[var(--primary)] bg-indigo-50"
                  : "border-gray-300 hover:bg-gray-50"
              } rounded-xl p-10 transition-colors cursor-pointer`}
              onClick={() =>
                !busy &&
                fileInputRef.current.click()
              }
            >

              <div className="icon-cloud-upload text-5xl text-[var(--primary)] mb-4 w-16 h-16 flex items-center justify-center mx-auto"></div>


              <h3 className="text-lg font-bold text-gray-900">

                {files.length
                  ? `${files.length} photo${
                      files.length > 1
                        ? "s"
                        : ""
                    } selected — click to add more`
                  : "Click to Upload Notebook Photo(s)"}

              </h3>


              <p className="text-gray-500 mt-2">

                JPG or PNG · select multiple pages
                at once (PDFs need poppler on the backend)

              </p>

            </div>


            {previews.length > 0 && (

              <div className="mt-4 flex flex-wrap justify-center gap-3">

                {previews.map(
                  (src, i) => (

                    <div
                      key={src}
                      className="relative"
                    >

                      <img
                        src={src}
                        alt={`Page ${i + 1}`}
                        className="h-28 w-28 object-cover rounded-lg border"
                      />


                      <span className="absolute top-1 left-1 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded">

                        {i + 1}

                      </span>


                      <button
                        type="button"
                        onClick={() =>
                          removeFile(i)
                        }
                        disabled={busy}
                        className="absolute -top-2 -right-2 bg-white border border-gray-300 rounded-full w-5 h-5 text-xs leading-none text-gray-600 hover:text-red-600 hover:border-red-300"
                        title="Remove this photo"
                      >
                        ×
                      </button>

                    </div>

                  )
                )}

              </div>

            )}


            <div className="mt-6 flex items-center justify-center gap-3">

              <button
                className="btn-primary"
                onClick={startValidation}
                disabled={busy}
              >

                {busy ? (
                  <div className="icon-loader animate-spin"></div>
                ) : (
                  <div className="icon-wand-sparkles"></div>
                )}

                {
                  busy
                    ? "Working…"
                    : `Extract & Review${
                        files.length > 1
                          ? ` (${files.length} pages)`
                          : ""
                      }`
                }

              </button>

            </div>


            {statusText && (

              <p className="text-sm text-gray-500 mt-3">
                {statusText}
              </p>

            )}

          </div>


          {/* Homework History */}

          <div className="card p-0">

            <div className="p-4 border-b border-[var(--border-color)] flex flex-wrap items-center justify-between gap-3">

              <h3 className="font-bold text-gray-900">
                Homework history
              </h3>


              <div className="flex items-center gap-2 text-sm">

                <label className="text-gray-500">
                  From
                </label>

                <input
                  type="date"
                  className="input-field"
                  style={{
                    width: "auto"
                  }}
                  value={fromDate}
                  onChange={(e) =>
                    setFromDate(
                      e.target.value
                    )
                  }
                />


                <label className="text-gray-500">
                  To
                </label>

                <input
                  type="date"
                  className="input-field"
                  style={{
                    width: "auto"
                  }}
                  value={toDate}
                  onChange={(e) =>
                    setToDate(
                      e.target.value
                    )
                  }
                />


                {(fromDate || toDate) && (

                  <button
                    className="btn-secondary text-xs"
                    onClick={() => {
                      setFromDate("");
                      setToDate("");
                    }}
                  >
                    Clear
                  </button>

                )}

              </div>

            </div>


            <div className="overflow-x-auto">

              <table className="w-full text-sm">

                <thead>

                  <tr className="text-left text-gray-500 border-b border-[var(--border-color)]">

                    <th className="p-3">
                      Subject / File
                    </th>

                    <th className="p-3">
                      Date
                    </th>

                    <th className="p-3">
                      Score
                    </th>

                    <th className="p-3">
                      Status
                    </th>

                    <th className="p-3"></th>

                  </tr>

                </thead>


                <tbody>

                  {historyLoading && (

                    <tr>

                      <td
                        colSpan="5"
                        className="p-4 text-center text-gray-400"
                      >
                        Loading…
                      </td>

                    </tr>

                  )}


                  {!historyLoading &&
                    history.length === 0 && (

                    <tr>

                      <td
                        colSpan="5"
                        className="p-4 text-center text-gray-400"
                      >
                        No homework uploaded yet.
                      </td>

                    </tr>

                  )}


                  {!historyLoading &&
                    history.map(
                      (row) => (

                        <tr
                          key={row.id}
                          className="border-b border-[var(--border-color)] last:border-0"
                        >

                          <td className="p-3">

                            <div className="font-medium text-gray-900">

                              {
                                row.subject ||
                                row.original_filename ||
                                "Untitled"
                              }

                            </div>


                            {row.linked_paper_id ? (

                              <div className="text-xs text-gray-500">
                                From a generated test
                              </div>

                            ) : (

                              <div className="text-xs text-gray-500">
                                Own homework
                              </div>

                            )}

                          </td>


                          <td className="p-3 text-gray-600">

                            {fmtDate(
                              row.submission_date
                            )}

                          </td>


                          <td className="p-3 font-semibold">

                            {
                              row.total_score != null
                                ? `${row.total_score} / ${row.total_max_score}`
                                : "—"
                            }

                          </td>


                          <td className="p-3">

                            <span
                              className={`text-xs px-2 py-1 rounded-full ${
                                row.status === "graded"
                                  ? "bg-green-100 text-green-700"
                                  : row.status === "failed"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >

                              {row.status}

                            </span>

                          </td>


                          <td className="p-3 text-right">

                            <button
                              className="btn-secondary text-xs"
                              onClick={() =>
                                openView(row)
                              }
                            >
                              View
                            </button>

                          </td>

                        </tr>

                      )
                    )}

                </tbody>

              </table>

            </div>

          </div>

        </div>

      )}


      {/* =====================================================
          STEP 1 — REVIEW OCR
      ===================================================== */}

      {step === 1 && (

        <div className="space-y-4">

          <div className="card p-4 bg-indigo-50 border-indigo-100 text-sm text-gray-700">

            Review the AI-extracted text and questions
            below. Rescan a page if it's wrong, then
            approve to grade.

          </div>


          {questions.length > 0 && (

            <div className="card p-6">

              <h4 className="font-semibold text-gray-900 mb-3">

                {
                  questions.some(
                    (q) =>
                      q.auto_extracted
                  )
                    ? "Questions detected from the scan"
                    : "Questions"
                }

              </h4>


              {questions.map(
                (q) => (

                  <div
                    key={q.id}
                    className="flex justify-between items-start py-2 border-b border-[var(--border-color)] last:border-0"
                  >

                    <div>

                      <span className="font-medium text-gray-900">
                        Q{q.question_number}.
                      </span>{" "}

                      <span className="text-gray-700">
                        {q.question_text}
                      </span>


                      {q.auto_extracted && (

                        <span className="ml-2 text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">

                          AI-detected

                        </span>

                      )}

                    </div>


                    <span className="text-sm text-gray-500 whitespace-nowrap ml-4">

                      {q.max_marks} marks

                    </span>

                  </div>

                )
              )}

            </div>

          )}


          {pages.map(
            (p) => (

              <div
                key={p.id}
                className="card p-6"
              >

                <div className="flex justify-between items-center mb-3 text-sm text-gray-500">

                  <span className="font-semibold text-gray-900">

                    Page {p.page_number}
                    {" · "}
                    {p.original_filename || ""}

                  </span>


                  <span>

                    engine:{" "}

                    {
                      p.current_text
                        ? p.current_text
                            .ocr_engine_used
                        : "—"
                    }

                    {" · confidence: "}

                    {
                      p.current_text &&
                      p.current_text.confidence_score != null
                        ? Math.round(
                            p.current_text
                              .confidence_score *
                              100
                          ) + "%"
                        : "—"
                    }

                  </span>

                </div>


                <textarea
                  className="input-field h-56 font-mono text-sm bg-gray-50"
                  readOnly
                  value={
                    p.current_text
                      ? p.current_text.raw_text
                      : "(no text)"
                  }
                />


                <div className="mt-3 flex justify-between items-center">

                  <span className="text-xs text-gray-500">

                    Attempts:
                    {" "}
                    {p.ocr_attempt_count}

                  </span>


                  <button
                    className="btn-secondary text-sm"
                    onClick={() =>
                      rescanPage(p.id)
                    }
                    disabled={busy}
                  >

                    <div className="icon-refresh-cw"></div>

                    Rescan this page

                  </button>

                </div>

              </div>

            )
          )}


          <div className="flex justify-end gap-3">

            <button
              className="btn-secondary"
              onClick={reset}
              disabled={busy}
            >
              Cancel
            </button>


            <button
              className="btn-primary"
              onClick={approveAndGrade}
              disabled={busy}
            >

              {busy ? (
                <div className="icon-loader animate-spin"></div>
              ) : (
                <div className="icon-circle-check"></div>
              )}


              {
                busy
                  ? "Grading…"
                  : "Approve & Grade"
              }

            </button>

          </div>


          {statusText && (

            <p className="text-sm text-gray-500 text-right">
              {statusText}
            </p>

          )}

        </div>

      )}


      {/* =====================================================
          STEP 2 — RESULT
      ===================================================== */}

      {step === 2 && result && (

        <div className="card p-0">

          <div className="p-4 border-b border-[var(--border-color)] bg-gray-50 flex justify-between items-center">

            <h3 className="font-bold text-gray-900">

              Result —
              {" "}
              {result.total_score}
              {" / "}
              {result.total_max_score}
              {" "}
              ({pct}%)

            </h3>


            <button
              className="btn-secondary text-sm"
              onClick={reset}
            >

              <div className="icon-refresh-cw"></div>

              New Upload

            </button>

          </div>


          <div className="p-6 space-y-4">

            {result.results.map(
              (r, i) => (

                <div
                  key={i}
                  className="bg-gray-50 border border-gray-200 rounded-lg p-4"
                >

                  <div className="flex justify-between items-center mb-1">

                    <span className="font-semibold text-gray-900">

                      Question{" "}
                      {r.question_number}

                    </span>


                    <span className="text-lg font-bold">

                      {r.score}
                      {" / "}
                      {r.max_score}

                    </span>

                  </div>


                  {r.flagged_illegible && (

                    <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded">

                      flagged illegible

                    </span>

                  )}


                  {r.feedback && (

                    <p className="text-sm text-gray-800 mt-2">

                      {r.feedback}

                    </p>

                  )}


                  {(r.deductions || []).map(
                    (d, j) => (

                      <div
                        key={j}
                        className="text-sm text-red-600 mt-1"
                      >

                        − {d.points_lost}:{" "}
                        {d.reason}

                      </div>

                    )
                  )}

                </div>

              )
            )}

          </div>

        </div>

      )}


      {/* =====================================================
          VIEW MODAL
      ===================================================== */}

      {viewSubmission && (

        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() =>
            setViewSubmission(null)
          }
        >

          <div
            className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center sticky top-0 bg-white">

              <h3 className="font-bold text-gray-900">

                {
                  viewSubmission.row.subject ||
                  viewSubmission.row.original_filename
                }

                {" — "}

                {fmtDate(
                  viewSubmission.row
                    .submission_date
                )}

              </h3>


              <button
                className="btn-secondary text-xs"
                onClick={() =>
                  setViewSubmission(null)
                }
              >
                Close
              </button>

            </div>


            <div className="p-6 space-y-4">

              {viewSubmission.pages &&
                viewSubmission.pages.length > 0 && (

                <div>

                  <h4 className="font-semibold text-gray-900 mb-2">

                    Uploaded file
                    {viewSubmission.pages.length > 1
                      ? "s"
                      : ""}

                  </h4>


                  <div className="flex flex-wrap gap-3">

                    {viewSubmission.pages.map(
                      (p) => (

                        <a
                          key={p.id}
                          href={
                            backendUrl.replace(
                              /\/$/,
                              ""
                            ) +
                            p.file_url
                          }
                          target="_blank"
                          rel="noreferrer"
                        >

                          <img
                            src={
                              backendUrl.replace(
                                /\/$/,
                                ""
                              ) +
                              p.file_url
                            }
                            alt={
                              p.original_filename ||
                              `Page ${p.page_number}`
                            }
                            className="h-40 rounded-lg border border-gray-200 object-cover hover:opacity-90"
                          />

                        </a>

                      )
                    )}

                  </div>

                </div>

              )}


              <div className="text-lg font-bold">

                {
                  viewSubmission.result
                    .total_score
                }

                {" / "}

                {
                  viewSubmission.result
                    .total_max_score
                }

              </div>


              {viewSubmission.result.results.map(
                (r, i) => (

                  <div
                    key={i}
                    className="bg-gray-50 border border-gray-200 rounded-lg p-4"
                  >

                    <div className="flex justify-between items-center mb-1">

                      <span className="font-semibold text-gray-900">

                        Question{" "}
                        {r.question_number}

                      </span>


                      <span className="text-lg font-bold">

                        {r.score}
                        {" / "}
                        {r.max_score}

                      </span>

                    </div>


                    {r.feedback && (

                      <p className="text-sm text-gray-800 mt-2">

                        {r.feedback}

                      </p>

                    )}


                    {(r.deductions || []).map(
                      (d, j) => (

                        <div
                          key={j}
                          className="text-sm text-red-600 mt-1"
                        >

                          − {d.points_lost}:{" "}
                          {d.reason}

                        </div>

                      )
                    )}

                  </div>

                )
              )}

            </div>

          </div>

        </div>

      )}


      {/* Toast */}

      {toast && (

        <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 z-50 max-w-md">

          <div className="icon-circle-check text-green-400"></div>

          {toast}

        </div>

      )}

    </DashboardLayout>
  );
}


const root =
  ReactDOM.createRoot(
    document.getElementById("root")
  );


root.render(

  <ErrorBoundary>

    <ValidationApp />

  </ErrorBoundary>

);