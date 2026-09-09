// ============================================================
// AI Test Paper Platform — API
// Supabase Authentication + Homework Grader Backend
// ============================================================

const BACKEND_URL =
  window.BACKEND_URL ||
  "http://127.0.0.1:5003";


// ------------------------------------------------------------
// SUPABASE CLIENT
// ------------------------------------------------------------

let supabaseClient = null;

function getSupabaseClient() {

  if (supabaseClient) {
    return supabaseClient;
  }

  if (
    typeof SUPABASE_URL === "undefined" ||
    typeof SUPABASE_PUBLISHABLE_KEY === "undefined"
  ) {
    throw new Error(
      "Supabase configuration is missing. Check config.js."
    );
  }

  if (!window.supabase) {
    throw new Error(
      "Supabase library is not loaded."
    );
  }

  supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );

  return supabaseClient;
}


// ------------------------------------------------------------
// LOCAL STORAGE KEYS
// ------------------------------------------------------------

const STORAGE_KEYS = {
  CHAPTERS: "ai_assessment_chapters",
  PAPERS: "ai_assessment_papers",
};


// ------------------------------------------------------------
// LOCAL STORAGE HELPERS
// ------------------------------------------------------------

function getData(key) {

  try {
    return JSON.parse(
      localStorage.getItem(key) || "[]"
    );
  } catch {
    return [];
  }
}


function setData(key, value) {

  localStorage.setItem(
    key,
    JSON.stringify(value)
  );

}


function createId() {

  return Date.now().toString();

}


// ------------------------------------------------------------
// SUPABASE AUTH HELPERS
// ------------------------------------------------------------

async function getSession() {

  const supabase = getSupabaseClient();

  const {
    data,
    error
  } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return data.session;

}


// ------------------------------------------------------------
// ACCESS TOKEN
// ------------------------------------------------------------
// IMPORTANT:
// Student login stores its JWT in "student_access_token".
// Parent login uses the normal Supabase session.
// ------------------------------------------------------------

async function getAccessToken() {

  // ----------------------------------------------------------
  // 1. Student token
  // ----------------------------------------------------------

  const studentToken = localStorage.getItem(
    "student_access_token"
  );

  if (studentToken) {
    return studentToken;
  }

  // ----------------------------------------------------------
  // 2. Normal Supabase session
  //    Used by Parent login
  // ----------------------------------------------------------

  const session = await getSession();

  if (!session) {
    return null;
  }

  return session.access_token;

}


// ------------------------------------------------------------
// STUDENT TOKEN REFRESH
// ------------------------------------------------------------
// Parent sessions renew automatically via the Supabase SDK. Student
// sessions are issued by our own /student-auth/login and stored by hand,
// so they need their own renewal path — this exchanges the stored
// refresh token for a new pair via POST /student-auth/refresh. Returns
// the new access token, or null if the refresh itself failed (refresh
// token expired/invalid), in which case the student needs to log in
// again for real.

async function refreshStudentToken() {

  const refreshToken = localStorage.getItem("student_refresh_token");

  if (!refreshToken) {
    return null;
  }

  try {

    const response = await fetch(
      BACKEND_URL.replace(/\/$/, "") + "/student-auth/refresh",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      }
    );

    if (!response.ok) {
      localStorage.removeItem("student_access_token");
      localStorage.removeItem("student_refresh_token");
      return null;
    }

    const data = await response.json();

    localStorage.setItem("student_access_token", data.session.access_token);
    localStorage.setItem("student_refresh_token", data.session.refresh_token);

    return data.session.access_token;

  } catch {
    return null;
  }

}


// ------------------------------------------------------------
// BACKEND API HELPER
// ------------------------------------------------------------

async function backendFetch(
  path,
  options = {},
  _isRetry = false
) {

  const isStudentSession = !!localStorage.getItem("student_access_token");

  const token = await getAccessToken();

  const headers = {
    Accept: "application/json",
    ...(options.headers || {})
  };


  // Only auto-set JSON headers for plain object/string bodies. A FormData
  // body (used for file uploads) must NOT get an explicit Content-Type —
  // the browser sets one itself, including the multipart boundary, and
  // overriding it here would break every file upload silently.
  const isFormData =
    typeof FormData !== "undefined" &&
    options.body instanceof FormData;

  if (
    options.body &&
    !isFormData &&
    !headers["Content-Type"]
  ) {

    headers["Content-Type"] =
      "application/json";

  }


  if (token) {

    headers.Authorization =
      `Bearer ${token}`;

  }


  const response = await fetch(
    BACKEND_URL.replace(/\/$/, "") + path,
    {
      ...options,
      headers
    }
  );


  // A student's access token expires roughly hourly. On a 401, try
  // refreshing it once and replaying the exact same request before
  // giving up — this is what actually keeps a student logged in past
  // that expiry instead of failing every request until they sign in
  // again by hand.
  if (
    response.status === 401 &&
    isStudentSession &&
    !_isRetry
  ) {

    const newToken = await refreshStudentToken();

    if (newToken) {
      return backendFetch(path, options, true);
    }

  }


  if (!response.ok) {

    let message =
      `Request failed (${response.status})`;

    try {

      const data =
        await response.json();

      if (data.detail) {
        message =
          typeof data.detail === "string"
            ? data.detail
            : JSON.stringify(data.detail);
      }

    } catch {
      // Ignore JSON parsing failure.
    }


    const error =
      new Error(message);

    error.status =
      response.status;

    throw error;

  }


  return response.json();

}


// ------------------------------------------------------------
// AUTH
// ------------------------------------------------------------

const authAPI = {

  getUser: () => {

    try {

      const stored =
        localStorage.getItem(
          "auth_user"
        );

      return stored
        ? JSON.parse(stored)
        : null;

    } catch {

      localStorage.removeItem(
        "auth_user"
      );

      return null;

    }

  },


  getSession: async () => {

    return getSession();

  },


  getAccessToken: async () => {

    return getAccessToken();

  },


  checkAuth: async () => {

    const isAuthPage =
      window.location.pathname.includes(
        "login"
      ) ||
      window.location.pathname.includes(
        "signup"
      );


    // --------------------------------------------------------
    // Student authentication
    // --------------------------------------------------------

    const studentToken =
      localStorage.getItem(
        "student_access_token"
      );

    if (studentToken) {
      return true;
    }


    // --------------------------------------------------------
    // Normal Supabase authentication
    // --------------------------------------------------------

    const session =
      await getSession();


    if (
      !session &&
      !isAuthPage
    ) {

      window.location.href =
        "login.html";

      return false;

    }


    return true;

  },


  login: async (
    email,
    password
  ) => {

    const supabase =
      getSupabaseClient();


    const {
      data,
      error
    } =
      await supabase.auth.signInWithPassword(
        {
          email,
          password
        }
      );


    if (error) {
      throw new Error(
        error.message ||
        "Login failed"
      );
    }


    if (!data.user) {

      throw new Error(
        "Login succeeded but no user was returned."
      );

    }


    const user = {

      id: data.user.id,

      Name:
        data.user.user_metadata?.name ||
        data.user.user_metadata?.full_name ||
        data.user.email,

      Email:
        data.user.email,

      Role:
        data.user.user_metadata?.role ||
        "User"

    };


    localStorage.setItem(
      "auth_user",
      JSON.stringify(user)
    );


    return user;

  },


  signup: async (
    name,
    email,
    password
  ) => {

    const supabase =
      getSupabaseClient();


    const {
      data,
      error
    } =
      await supabase.auth.signUp({

        email,

        password,

        options: {

          data: {

            name,

            full_name: name,

            role: "User"

          }

        }

      });


    if (error) {

      throw new Error(
        error.message ||
        "Signup failed"
      );

    }


    if (!data.user) {

      throw new Error(
        "Signup failed: no user returned."
      );

    }


    if (!data.session) {

      return {

        id: data.user.id,

        Name: name,

        Email: data.user.email,

        Role: "User",

        RequiresEmailVerification: true

      };

    }


    const user = {

      id: data.user.id,

      Name: name,

      Email: data.user.email,

      Role: "User"

    };


    localStorage.setItem(
      "auth_user",
      JSON.stringify(user)
    );


    return user;

  },


  logout: async () => {

    try {

      const supabase =
        getSupabaseClient();

      await supabase.auth.signOut();

    } finally {

      // Clear both parent and student authentication.
      localStorage.removeItem(
        "auth_user"
      );

      localStorage.removeItem(
        "student_id"
      );

      localStorage.removeItem(
        "student_access_token"
      );

      localStorage.removeItem(
        "student_refresh_token"
      );

      window.location.href =
        "login.html";

    }

  }

};


// ------------------------------------------------------------
// DIRECTORY
// ------------------------------------------------------------

const directoryAPI = {

  getMe: async () => {

    return backendFetch(
      "/directory/me"
    );

  },


  createParent: async (
    name
  ) => {

    return backendFetch(
      "/directory/parent",
      {
        method: "POST",

        body: JSON.stringify({
          name
        })
      }
    );

  },


  createStudent: async (
    name,
    grade,
    school,
    classTeacher
  ) => {

    return backendFetch(
      "/directory/students",
      {
        method: "POST",

        body: JSON.stringify({
          name,
          grade,
          school: school || null,
          class_teacher: classTeacher || null
        })
      }
    );

  },


  // ----------------------------------------------------------
  // RESET STUDENT PASSWORD
  // ----------------------------------------------------------

  resetStudentPassword: async (
    studentId
  ) => {

    if (!studentId) {
      throw new Error(
        "Student ID is required."
      );
    }

    return backendFetch(
      `/directory/students/${encodeURIComponent(studentId)}/reset-password`,
      {
        method: "POST"
      }
    );

  },


  // Permanently deletes a child's profile and all their homework data.
  // Requires the PARENT's own account password (verified server-side
  // against Supabase Auth) — see routers/directory.py:delete_student.
  deleteStudent: async (
    studentId,
    password
  ) => {

    if (!studentId) {
      throw new Error(
        "Student ID is required."
      );
    }

    return backendFetch(
      `/directory/students/${encodeURIComponent(studentId)}`,
      {
        method: "DELETE",
        body: JSON.stringify({ password }),
      }
    );

  }

};


// ------------------------------------------------------------
// REPORTS
// ------------------------------------------------------------

const reportsAPI = {

  getStudentReport: async (
    studentId
  ) => {

    if (!studentId) {

      throw new Error(
        "Student ID is required."
      );

    }


    return backendFetch(
      `/reports/student/${encodeURIComponent(studentId)}`
    );

  }

};


// ------------------------------------------------------------
// SUBMISSIONS
// ------------------------------------------------------------

const submissionsAPI = {

  // Uploads homework for a given student — used by BOTH the child's own
  // Homework Validation page AND the parent's Uploads section (see
  // parent-portal-updated.html). Since both call this exact same endpoint
  // with the target student's id, both write into the one shared
  // submissions table — which is what makes the homework history and
  // Reports & Analytics reflect uploads from either side automatically.
  create: async (
    studentId,
    files,
    { subject, questionSource } = {}
  ) => {

    if (!studentId) {
      throw new Error("A student must be selected before uploading.");
    }
    if (!files || !files.length) {
      throw new Error("Please choose at least one file to upload.");
    }

    const form = new FormData();
    form.append("student_id", studentId);
    if (subject) form.append("subject", subject);
    form.append("question_source", questionSource || "embedded");
    Array.from(files).forEach((f) => form.append("files", f));

    return backendFetch(
      "/submissions",
      {
        method: "POST",
        body: form,
      }
    );

  },


  listByStudent: async (
    studentId
  ) => {

    return backendFetch(
      `/submissions/student/${encodeURIComponent(studentId)}`
    );

  },


  addQuestions: async (
    submissionId,
    questions
  ) => {

    return backendFetch(
      `/submissions/${encodeURIComponent(submissionId)}/questions`,
      {
        method: "POST",
        body: JSON.stringify({ questions }),
      }
    );

  },


  approve: async (
    submissionId,
    pageIds
  ) => {

    return backendFetch(
      `/submissions/${encodeURIComponent(submissionId)}/approve`,
      {
        method: "POST",
        body: JSON.stringify({ page_ids: pageIds }),
      }
    );

  },


  rescan: async (
    submissionId,
    pageIds,
    studentNote
  ) => {

    return backendFetch(
      `/submissions/${encodeURIComponent(submissionId)}/rescan`,
      {
        method: "POST",
        body: JSON.stringify({
          page_ids: pageIds || null,
          student_note: studentNote || null,
        }),
      }
    );

  },


  get: async (
    submissionId
  ) => {

    return backendFetch(
      `/submissions/${encodeURIComponent(submissionId)}`
    );

  },


  getResult: async (
    submissionId
  ) => {

    return backendFetch(
      `/submissions/${encodeURIComponent(submissionId)}/result`
    );

  }

};


// ------------------------------------------------------------
// BLOB FETCH (for downloading files with auth, e.g. report cards)
// ------------------------------------------------------------
// backendFetch() always parses JSON, which is wrong for a PDF/image. This
// variant sends the same Authorization header but hands back a Blob, so the
// caller can turn it into an object URL and open/preview it.

async function backendFetchBlob(path, options = {}, _isRetry = false) {

  const isStudentSession = !!localStorage.getItem("student_access_token");

  const token = await getAccessToken();

  const headers = { ...(options.headers || {}) };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(
    BACKEND_URL.replace(/\/$/, "") + path,
    { ...options, headers }
  );

  if (response.status === 401 && isStudentSession && !_isRetry) {
    const newToken = await refreshStudentToken();
    if (newToken) {
      return backendFetchBlob(path, options, true);
    }
  }

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const data = await response.json();
      if (data.detail) {
        message = typeof data.detail === "string"
          ? data.detail
          : JSON.stringify(data.detail);
      }
    } catch {
      // ignore
    }
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return response.blob();
}


// ------------------------------------------------------------
// SCHEDULED TESTS
// ------------------------------------------------------------
// A parent generates + schedules an MCQ test for a child. The child sees it in
// their own account, is notified at the scheduled time, takes it in-app, and
// it's auto-graded. All calls hit the same grader backend, secured by the same
// parent/student JWT the rest of the app already uses.

const testsAPI = {

  // Parent creates a scheduled test for a child.
  // scheduledAtISO must be a UTC ISO string ending in "Z".
  createForChild: async ({
    studentId,
    title,
    subject,
    chapter,
    scheduledAtISO,
    durationMinutes,
    questions,
  }) => {

    if (!studentId) throw new Error("Please select a child first.");
    if (!scheduledAtISO) throw new Error("Please choose a date and time.");
    if (!questions || !questions.length) {
      throw new Error("Generate the questions before scheduling.");
    }

    return backendFetch("/tests", {
      method: "POST",
      body: JSON.stringify({
        student_id: studentId,
        title: title || "Test",
        subject: subject || null,
        chapter: chapter || null,
        scheduled_at: scheduledAtISO,
        duration_minutes: durationMinutes || null,
        questions,
      }),
    });
  },

  // Parent: all tests scheduled for one child.
  listForChild: async (studentId) => {
    if (!studentId) throw new Error("Student ID is required.");
    return backendFetch(`/tests/child/${encodeURIComponent(studentId)}`);
  },

  // Student: my own tests (upcoming / available / completed).
  listMine: async () => {
    return backendFetch("/tests/my");
  },

  // Student: fetch questions to take (answers stripped out server-side).
  take: async (testId) => {
    return backendFetch(`/tests/${encodeURIComponent(testId)}/take`);
  },

  // Student: submit chosen answers (array of option indexes); auto-graded.
  submit: async (testId, answers) => {
    return backendFetch(`/tests/${encodeURIComponent(testId)}/submit`, {
      method: "POST",
      body: JSON.stringify({ answers }),
    });
  },

  // Parent or student: full result breakdown of a completed test.
  getResult: async (testId) => {
    return backendFetch(`/tests/${encodeURIComponent(testId)}/result`);
  },

  // Parent: delete a scheduled test.
  remove: async (testId) => {
    return backendFetch(`/tests/${encodeURIComponent(testId)}`, {
      method: "DELETE",
    });
  },
};


// ------------------------------------------------------------
// REPORT CARDS
// ------------------------------------------------------------
// PARENT-ONLY. A parent uploads a report card; the backend runs it through
// Gemini automatically and stores a plain-language overview (subjects,
// marks, attendance, remarks, strengths/areas to improve — parsed JSON in
// `overview`). None of this is ever reachable from a student session.

const reportCardsAPI = {

  // Parent uploads a report card file (PDF/image) for a child. The backend
  // analyzes it synchronously and returns the record with `overview`
  // already filled in (or null if analysis failed — see `analyze` below).
  upload: async (studentId, { term, note } = {}, file) => {
    if (!studentId) throw new Error("Please select a child first.");
    if (!file) throw new Error("Please choose a file to upload.");

    const form = new FormData();
    form.append("student_id", studentId);
    if (term) form.append("term", term);
    if (note) form.append("note", note);
    form.append("file", file);

    return backendFetch("/report-cards", { method: "POST", body: form });
  },

  // Parent: list a child's report cards.
  listForChild: async (studentId) => {
    if (!studentId) throw new Error("Student ID is required.");
    return backendFetch(`/report-cards/child/${encodeURIComponent(studentId)}`);
  },

  // Parent: (re)generate the AI overview for an already-uploaded card —
  // used as a retry if the automatic analysis on upload failed.
  analyze: async (cardId) => {
    return backendFetch(`/report-cards/${encodeURIComponent(cardId)}/analyze`, {
      method: "POST",
    });
  },

  // Fetch the actual file as a Blob (with auth) so it can be previewed/opened.
  fetchFileBlob: async (cardId) => {
    return backendFetchBlob(`/report-cards/${encodeURIComponent(cardId)}/file`);
  },

  remove: async (cardId) => {
    return backendFetch(`/report-cards/${encodeURIComponent(cardId)}`, {
      method: "DELETE",
    });
  },
};


// ------------------------------------------------------------
// MCQ GENERATION (client-side, via Gemini)
// ------------------------------------------------------------
// Reuses the same Gemini setup as the Test Paper Generator, but asks for a
// strict JSON array of multiple-choice questions so a scheduled test can be
// auto-graded. If no Gemini key is configured, or parsing fails, it falls back
// to a small built-in sample so scheduling a test always works for a demo.

const FALLBACK_MCQS = [
  {
    question: "Which of these is a unit of distance?",
    options: ["Second", "Metre", "Kilogram", "Newton"],
    answer_index: 1,
    explanation: "Distance is measured in metres (m).",
  },
  {
    question: "Displacement is best described as…",
    options: [
      "The total path length covered",
      "The shortest distance between start and end points",
      "The speed of an object",
      "The time taken to move",
    ],
    answer_index: 1,
    explanation:
      "Displacement is the straight-line distance from the initial to the final position.",
  },
  {
    question: "Uniform motion means the object covers…",
    options: [
      "Unequal distances in equal time intervals",
      "Equal distances in equal time intervals",
      "No distance at all",
      "Distance only in a circle",
    ],
    answer_index: 1,
    explanation: "In uniform motion, equal distances are covered in equal times.",
  },
  {
    question: "Which quantity has both magnitude and direction?",
    options: ["Distance", "Speed", "Velocity", "Time"],
    answer_index: 2,
    explanation: "Velocity is a vector — it has magnitude and direction.",
  },
  {
    question: "The SI unit of time is the…",
    options: ["Metre", "Hour", "Second", "Minute"],
    answer_index: 2,
    explanation: "The second (s) is the SI base unit of time.",
  },
];

const mcqAPI = {

  // Returns a promise of { questions: [...], usedFallback: bool }.
  generate: async ({ subject, topic, difficulty = "Medium", count = 5 } = {}) => {

    const safeCount = Math.max(1, Math.min(20, Number(count) || 5));

    const model =
      localStorage.getItem("gemini_model") || "gemini-3.6-flash";

    const prompt = `
You are an expert CBSE school teacher setting a multiple-choice test.

Create exactly ${safeCount} multiple-choice questions.
Subject: ${subject || "General"}
Topic / chapter: ${topic || subject || "General knowledge"}
Difficulty: ${difficulty}

STRICT RULES:
- Each question must have exactly 4 options.
- Exactly one option is correct.
- Keep questions and options short and clear, suitable for a school student.
- Do NOT reference figures, diagrams or images.
- Return ONLY valid JSON. No markdown, no backticks, no commentary.

Return a JSON array where each element is:
{
  "question": "….",
  "options": ["….", "….", "….", "…."],
  "answer_index": 0,
  "explanation": "one short sentence on why the answer is correct"
}

"answer_index" is the 0-based index (0-3) of the correct option.
`.trim();

    // Runs server-side now — the backend holds the Gemini key (same one
    // already used for OCR/grading), never the browser. See
    // app/routers/generation.py.
    let content;
    try {
      const result = await backendFetch("/generate", {
        method: "POST",
        body: JSON.stringify({ prompt, model }),
      });
      content = result.text || "";
    } catch (e) {
      console.error("MCQ generation request failed:", e);
      return { questions: FALLBACK_MCQS.slice(0, safeCount), usedFallback: true };
    }

    // Strip code fences and isolate the JSON array.
    content = content.replace(/```json/gi, "").replace(/```/g, "").trim();

    const start = content.indexOf("[");
    const end = content.lastIndexOf("]");
    if (start !== -1 && end !== -1) {
      content = content.slice(start, end + 1);
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      console.error("MCQ JSON parse failed:", e, content);
      return {
        questions: FALLBACK_MCQS.slice(0, safeCount),
        usedFallback: true,
      };
    }

    // Validate + clean each question.
    const cleaned = (Array.isArray(parsed) ? parsed : [])
      .map((q) => {
        const options = Array.isArray(q.options)
          ? q.options.map((o) => String(o)).slice(0, 4)
          : [];
        let idx = Number(q.answer_index);
        if (!Number.isInteger(idx) || idx < 0 || idx >= options.length) {
          idx = 0;
        }
        return {
          question: String(q.question || "").trim(),
          options,
          answer_index: idx,
          explanation: String(q.explanation || "").trim(),
        };
      })
      .filter((q) => q.question && q.options.length >= 2);

    if (!cleaned.length) {
      return {
        questions: FALLBACK_MCQS.slice(0, safeCount),
        usedFallback: true,
      };
    }

    return { questions: cleaned, usedFallback: false };
  },

  // ----------------------------------------------------------
  // CHAPTER-GROUNDED GENERATION
  // ----------------------------------------------------------
  // Mirrors generator-app.js's Paper Configuration panel exactly: same
  // Subject / Saved Chapter / Paper Set / Paper Type selection, same
  // localStorage("chapters") lookup, same gemini_model setting, same
  // chapter-text cleanup, and the same "use ONLY the
  // chapter content, never invent topics" grounding rules — just asking
  // for strict MCQ JSON (with an answer_index) instead of a free-text
  // question paper + answer key, since a scheduled test has to be
  // auto-gradable.
  //
  // Returns a promise of { questions: [...], usedFallback: bool }.
  generateFromChapter: async ({
    subject,
    chapterName,
    paperType = "Standard",
    paperSet = "1",
  } = {}) => {

    // Same counts-by-paper-type convention as the free-text generator's
    // OUTPUT RULES, translated to a single MCQ section since a scheduled
    // test is multiple-choice only.
    const countByType = { Standard: 5, Exhaustive: 10, Hard: 8 };
    const safeCount = countByType[paperType] || 5;

    // Same source as generator-app.js's `chaptersFromStorage` — chapters
    // are saved under the plain "chapters" key (chapters-app.js), NOT
    // chaptersAPI's dead "ai_assessment_chapters" key above.
    const chaptersFromStorage = JSON.parse(localStorage.getItem("chapters") || "[]");
    const selectedChapter = chaptersFromStorage.find((ch) => ch.name === chapterName);

    let chapterText =
      selectedChapter?.text ||
      selectedChapter?.Text ||
      selectedChapter?.summary ||
      selectedChapter?.Summary ||
      chapterName ||
      "";

    chapterText = chapterText
      .replace(/PAGE \d+/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .slice(0, 12000);

    const model = localStorage.getItem("gemini_model") || "gemini-3.6-flash";

    const prompt = `
You are an expert CBSE school teacher and question paper setter, creating a
multiple-choice test that will be auto-graded by a computer.

Generate exactly ${safeCount} multiple-choice questions ONLY from the
chapter content provided below.

SUBJECT: ${subject}
CHAPTER: ${chapterName}
PAPER SET: ${paperSet}
PAPER TYPE: ${paperType}

IMPORTANT RULES:
1. Use ONLY concepts explicitly present in the chapter content below.
2. Do NOT invent topics, formulas, or facts not present in the chapter.
3. Do NOT generate questions from the chapter title, page numbers,
   metadata, author names, acknowledgements, or index.
4. Every question must have exactly 4 options, with exactly one correct.
5. Vary difficulty appropriately for a "${paperType}" paper.
6. Do not ask questions that require a figure, diagram, map or image
   unless the actual figure data is present in the chapter text.
7. Avoid repeating the same question in different forms.
8. Generate different questions for different paper sets (this is set
   ${paperSet}).

Return ONLY valid JSON — no markdown, no backticks, no commentary. A JSON
array where each element is:
{
  "question": "….",
  "options": ["….", "….", "….", "…."],
  "answer_index": 0,
  "explanation": "one short sentence on why the answer is correct"
}

"answer_index" is the 0-based index (0-3) of the correct option.

CHAPTER CONTENT:
${chapterText}
`.trim();

    // Runs server-side now — the backend holds the Gemini key (same one
    // already used for OCR/grading), never the browser. See
    // app/routers/generation.py.
    let content;
    try {
      const result = await backendFetch("/generate", {
        method: "POST",
        body: JSON.stringify({ prompt, model }),
      });
      content = result.text || "";
    } catch (e) {
      console.error("Chapter-grounded MCQ generation request failed:", e);
      return { questions: FALLBACK_MCQS.slice(0, safeCount), usedFallback: true };
    }

    content = content.replace(/```json/gi, "").replace(/```/g, "").trim();

    const start = content.indexOf("[");
    const end = content.lastIndexOf("]");
    if (start !== -1 && end !== -1) {
      content = content.slice(start, end + 1);
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      console.error("Chapter-grounded MCQ JSON parse failed:", e, content);
      return { questions: FALLBACK_MCQS.slice(0, safeCount), usedFallback: true };
    }

    const cleaned = (Array.isArray(parsed) ? parsed : [])
      .map((q) => {
        const options = Array.isArray(q.options)
          ? q.options.map((o) => String(o)).slice(0, 4)
          : [];
        let idx = Number(q.answer_index);
        if (!Number.isInteger(idx) || idx < 0 || idx >= options.length) {
          idx = 0;
        }
        return {
          question: String(q.question || "").trim(),
          options,
          answer_index: idx,
          explanation: String(q.explanation || "").trim(),
        };
      })
      .filter((q) => q.question && q.options.length >= 2);

    if (!cleaned.length) {
      return { questions: FALLBACK_MCQS.slice(0, safeCount), usedFallback: true };
    }

    return { questions: cleaned, usedFallback: false };
  },
};


// ------------------------------------------------------------
// CHAPTERS
// ------------------------------------------------------------

const chaptersAPI = {

  list: async () => {

    return getData(
      STORAGE_KEYS.CHAPTERS
    );

  },


  create: async (
    name,
    subject,
    classLevel,
    file
  ) => {

    const chapters =
      getData(
        STORAGE_KEYS.CHAPTERS
      );


    const text =
      file
        ? await extractTextFromMockPDF(file)
        : "Sample extracted chapter text.";


    const chapter = {

      id: createId(),

      Name: name,

      Subject: subject,

      ClassLevel: classLevel,

      Text: text,

      Summary:
        "AI-generated summary containing key chapter concepts for paper generation.",

      Status:
        "Processed",

      UploadDate:
        new Date().toLocaleDateString()

    };


    chapters.push(chapter);

    setData(
      STORAGE_KEYS.CHAPTERS,
      chapters
    );


    return chapter;

  },


  delete: async (
    id
  ) => {

    const chapters =
      getData(
        STORAGE_KEYS.CHAPTERS
      )
      .filter(
        chapter =>
          chapter.id !== id
      );


    setData(
      STORAGE_KEYS.CHAPTERS,
      chapters
    );


    return true;

  }

};


// ------------------------------------------------------------
// PAPERS
// ------------------------------------------------------------

const papersAPI = {

  list: async () => {

    return getData(
      STORAGE_KEYS.PAPERS
    );

  },


  generate: async (
    subject,
    chapter,
    setNumber
  ) => {

    const papers =
      getData(
        STORAGE_KEYS.PAPERS
      );


    const existingPaper =
      papers.find(
        p =>
          p.Subject === subject &&
          p.Chapter === chapter &&
          p.SetNumber ===
            setNumber.toString()
      );


    if (existingPaper) {

      return {

        ...existingPaper,

        Loaded: true

      };

    }


    const questions =
`QUESTION PAPER

PAPER SET ${setNumber}

Section A: Easy MCQs

1. What is motion?
A) Change in position with time
B) Change in mass
C) Change in force
D) Change in shape

2. What is distance?
A) Shortest path
B) Total path covered
C) Speed per unit time
D) Force applied

Section B: Medium Short Answer Questions

1. Explain the difference between distance and displacement.

2. What is uniform motion?

Section C: Hard Long Answer Questions

1. Explain graphical representation of motion.`;


    const answers =
`ANSWER KEY - PAPER SET ${setNumber}

Section A: MCQ Answers
1. A) Change in position with time
2. B) Total path covered

Section B: Short Answers
1. Distance is the total path covered, while displacement is the shortest distance between initial and final position.
2. Uniform motion means covering equal distances in equal intervals of time.

Section C: Long Answers
1. Motion can be represented graphically using time on the x-axis and distance or displacement on the y-axis.`;


    const paper = {

      id: createId(),

      Subject: subject,

      Chapter: chapter,

      SetNumber:
        setNumber.toString(),

      Questions: questions,

      Answers: answers,

      CreatedAt:
        new Date().toLocaleString(),

      Status:
        "Generated",

      Loaded: false

    };


    papers.push(paper);

    setData(
      STORAGE_KEYS.PAPERS,
      papers
    );


    return paper;

  },

  // ----------------------------------------------------------
  // PRINTABLE PAPER — chapter-grounded, same prompt as generator-app.js
  // ----------------------------------------------------------
  // Used by the parent portal's "Printable test paper" mode (Tests tab).
  // Keeps the exact same prompt text as generator-app.js's
  // generatePaperWithGemini so both produce genuinely equivalent papers.
  // Runs through the server-side /generate proxy (app/routers/
  // generation.py) — no API key of any kind lives in the browser.
  //
  // Returns { questions: string, answers: string, usedFallback: bool } —
  // plain text, matching the QUESTION_PAPER_START/ANSWER_KEY_START
  // marker format handleGeneratePrintablePaper() expects.
  generateFromChapter: async ({
    subject,
    chapterName,
    paperType = "Standard",
    paperSet = "1",
  } = {}) => {

    const chaptersFromStorage = JSON.parse(localStorage.getItem("chapters") || "[]");
    const selectedChapter = chaptersFromStorage.find((ch) => ch.name === chapterName);

    let chapterText =
      selectedChapter?.text ||
      selectedChapter?.Text ||
      selectedChapter?.summary ||
      selectedChapter?.Summary ||
      chapterName ||
      "";

    chapterText = chapterText
      .replace(/PAGE \d+/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .slice(0, 12000);

    // Same Mathematics-specific exercise-section trimming as generator-app.js.
    if (subject === "Mathematics") {
      const exerciseIndex = chapterText.search(
        /Referring to Fig|Using the conventions|Practice Questions|End.?of.?Chapter/i
      );
      if (exerciseIndex !== -1) {
        chapterText = chapterText.substring(exerciseIndex);
      }
    }

    const processedChapterText = chapterText;
    const selectedSet = paperSet; // matches the ${selectedSet} interpolations below verbatim

    const prompt = `
You are an expert CBSE school teacher and question paper setter.

Generate a high-quality examination paper ONLY from the chapter content provided below.

SUBJECT:
${subject}

CHAPTER:
${chapterName}

PAPER SET:
${selectedSet}

PAPER TYPE:
${paperType}

IMPORTANT RULES:

1. Use ONLY concepts present in the chapter content.
FOR MATHEMATICS:
ABSOLUTE MATHEMATICS RULE:

If chapter contains an Exercise section,
generate ALL questions only from:

- Exercise questions
- Solved examples
- Practice questions

Ignore every other chapter section completely.

Do not generate questions from explanatory text,
activities, illustrations, figures, room layouts,
bathroom layouts, stories, introductions or examples
outside the exercise section.

Generate questions primarily from:
- solved examples
- exercise questions
- practice questions
- worked numerical problems
If the chapter contains Exercise Sets, Practice Problems,
Worked Examples or End-of-Chapter Exercises:

Generate 100% questions ONLY from:

- Exercise Questions
- Solved Examples
- Worked Examples
- Practice Questions

Never generate questions from chapter introduction,
history sections, stories, activities or explorations.

Do not invent new story-based questions.

Prefer rewording existing exercise questions over creating entirely new questions.

Exercise questions have highest priority.
Worked examples have second priority.
Theory text has lowest priority.

Do NOT generate questions from:
- historical notes
- introduction sections
- stories
- facts
- mathematicians
- history boxes
- "Did you know" content
- chapter background information




2. Do NOT generate questions from:
   - chapter title
   - page numbers
   - metadata
   - author names
   - acknowledgements
   - index
3. Do NOT invent topics not present in the chapter.
4. Generate different questions for different paper sets.
5. Include competency-based questions.
6. Include application-based questions.
7. Include higher-order thinking questions wherever possible.
8. Avoid repeating the same question in different forms.
9. Questions should resemble real school examination papers.
10. Use previous-year exam style wherever possible.
11. Cover all important topics from the chapter.
12. Do not refer to figures, diagrams, maps or tables unless actual figure data exists.

13. Questions must be directly based on chapter concepts.
14. Avoid irrelevant or metadata-based questions.
15. Do not ask questions that require a figure, diagram, map, image,
room layout, bathroom layout, graph or visual reference unless the
actual figure data is present in the chapter text.
16. If a question refers to Fig., Diagram, Graph, Image, Layout or Map,
convert it into a text-based mathematical problem using the available
coordinates, values or numerical information.
17. If a question depends on a figure, diagram, graph, map, room layout
or image that is not fully available in text form, do not use that question.

Instead generate a similar question using only the coordinates,
values or numerical information explicitly present in the chapter text.

Never ask:
- What are the coordinates of point X in Fig. ...
- What is the width of the door in Fig. ...
- What is shown in the diagram ...

unless all required coordinates and values are explicitly present in text.

If PAPER TYPE is Exhaustive:

Generate:

10 MCQs
10 Short Answer Questions
5 Long Answer Questions
3 HOTS Questions
2 Case Study Questions

Cover every topic and subtopic from the chapter.

Every important concept must appear at least once.

Include:
- competency based questions
- application based questions
- analytical questions
- previous year style questions

If PAPER TYPE is Hard:

Generate:

5 MCQs
5 Short Questions
5 Long Questions
5 HOTS Questions
3 Case Study Questions

Difficulty Level:
Very High



SPECIAL RULE FOR MATHEMATICS:

If SUBJECT is Mathematics:

Generate ONLY mathematics examination questions.
CRITICAL:

Generate questions only from concepts explicitly found
inside the provided chapter text.

Do not use your own mathematics knowledge to extend
the chapter beyond the provided content.

Do not generate any formula, theorem, concept,
question type or coordinate geometry operation
that is not explicitly present in the chapter content.

Forbidden unless explicitly present in chapter:

- Distance Formula
- Midpoint Formula
- Section Formula
- Equation of Line
- Slope Formula
- Area of Triangle using Coordinates

If these topics are not present in the chapter text,
do not generate questions from them.



CRITICAL:

Before generating the paper, first identify:

1. Worked Examples
2. Solved Examples
3. Exercise Questions
4. Practice Problems
5. End-of-Chapter Questions

Generate the paper primarily from these sections.

If exercise questions are available, do not generate questions from:
- chapter introduction
- historical content
- background reading
- explanatory stories

Exercise questions have highest priority.

Worked examples have second priority.

Theory text has lowest priority.

For Mathematics:
If exercise questions are available, generate questions ONLY from exercise questions and solved examples.

Do not generate questions from:
- figures
- room layouts
- bathroom layouts
- illustrations
- visual activities
- graphical activities

unless complete numerical data is explicitly available in text.


MATHEMATICS CHAPTER ACCURACY RULE:

The difficulty and type of questions must match the actual chapter content.

If the chapter mainly teaches concepts, coordinates, quadrants, axes, origin, or identification of points, generate conceptual and identification-based questions.

Do not force numerical calculations if the chapter does not explicitly teach numerical methods.

The generated paper should resemble the actual NCERT exercise questions of that chapter.

OUTPUT RULES:

If PAPER TYPE is Standard:
- 5 MCQs
- 3 Short Answer Questions
- 2 Long Answer Questions

If PAPER TYPE is Exhaustive:
- 10 MCQs
- 10 Short Answer Questions
- 5 Long Answer Questions
- 3 HOTS Questions
- 2 Case Study Questions

If PAPER TYPE is Hard:
- 5 MCQs
- 5 Short Questions
- 5 Long Questions
- 5 HOTS Questions
- 3 Case Study Questions

STRICTLY FOLLOW THESE COUNTS.
DO NOT REDUCE THE NUMBER OF QUESTIONS.
Use this exact format:

QUESTION_PAPER_START
QUESTION PAPER

PAPER SET ${selectedSet}

Subject: ${subject}
Chapter: ${chapterName}

Section A: Easy MCQs

1. ...
A) ...
B) ...
C) ...
D) ...

Section B: Short Answer Questions

1. ...
____________________________________________________________________
____________________________________________________________________
____________________________________________________________________

Section C: Long Answer Questions

1. ...
____________________________________________________________________
____________________________________________________________________
____________________________________________________________________
____________________________________________________________________
____________________________________________________________________

Section D: HOTS Questions

1. ...
____________________________________________________________________
____________________________________________________________________
____________________________________________________________________
____________________________________________________________________
____________________________________________________________________

Section E: Case Study Questions

1. ...
____________________________________________________________________
____________________________________________________________________
____________________________________________________________________
____________________________________________________________________
____________________________________________________________________

QUESTION_PAPER_END

ANSWER_KEY_START
ANSWER KEY - PAPER SET ${selectedSet}

Section A: MCQ Answers

1. ...

Section B: Short Answers

1. ...

Section C: Long Answers

1. ...

Section D: HOTS Answers

1. ...

Section E: Case Study Answers

1. ...

ANSWER_KEY_END
CRITICAL INSTRUCTION:

Your response will be considered INVALID if TOPIC_COVERAGE is missing.

After ANSWER_KEY_END output EXACTLY:

TOPIC_COVERAGE_START

✓ Topic Name
✓ Topic Name
✓ Topic Name
✓ Topic Name

TOPIC_COVERAGE_END

Do not skip this section.
FINAL REJECTION RULE:

Reject any question containing:

- Distance Formula
- Midpoint Formula
- Section Formula
- Slope
- Equation of Line
- Circle
- Collinearity
- Centroid

unless these exact topics appear inside the extracted exercise section.

If any of these topics are absent,
do not generate questions using them.
STRICT MATHEMATICS FILTER

Generate questions ONLY from topics explicitly present in the extracted text.

Never introduce:

- Distance Formula
- Midpoint Formula
- Section Formula
- Slope
- Equation of Line
- Circle
- Coordinate Proofs

unless these exact topics appear in the extracted text.

If not present, do not generate any question related to them.

Every question must contain at least one keyword that appears in the extracted chapter text.

Do not invent concepts, formulas, theorems, or mathematical terms that are not present in the extracted text.

If a concept is not explicitly mentioned in the chapter text, pretend that concept does not exist.
ULTIMATE VALIDATION RULE:

Before generating each question:

Verify that the exact concept exists in CHAPTER CONTENT.

If the concept is not explicitly present in CHAPTER CONTENT,
the question is forbidden.

Examples of forbidden concepts unless explicitly present:

- Distance between two points
- Distance Formula
- Midpoint Formula
- Section Formula
- Slope
- Equation of Line
- Circle
- Area using Coordinates
- Coordinate Proofs

If a forbidden concept appears in a question,
discard that question and generate a replacement.

CHAPTER CONTENT:
${processedChapterText}
`;

    let content;
    try {
      const result = await backendFetch("/generate", {
        method: "POST",
        body: JSON.stringify({
          prompt,
          model: localStorage.getItem("gemini_model") || "gemini-3.6-flash",
        }),
      });
      content = result.text || "";
    } catch (e) {
      console.error("Printable paper generation request failed:", e);
      return { questions: "", answers: "", usedFallback: true };
    }

    content = content.replace(/```text/g, "").replace(/```/g, "").trim();

    const questionMatch = content.match(
      /QUESTION_PAPER_START\s*([\s\S]*?)\s*QUESTION_PAPER_END/i
    );
    const answerMatch = content.match(
      /ANSWER_KEY_START\s*([\s\S]*?)\s*ANSWER_KEY_END/i
    );

    if (!questionMatch || !answerMatch) {
      // Same "couldn't be split automatically" fallback the UI already
      // has messaging for — show the raw output so nothing is lost.
      return { questions: content, answers: "", usedFallback: true };
    }

    return {
      questions: questionMatch[1].trim(),
      answers: answerMatch[1].trim(),
      usedFallback: false,
    };
  }

};


// ------------------------------------------------------------
// HOMEWORK
// ------------------------------------------------------------

const homeworkAPI = {

  validateManual: async (
    question,
    expected,
    studentAnswer,
    marks
  ) => {

    return {

      marks:
        `${Math.max(1, marks - 1)}/${marks}`,

      correctPoints: [

        "Student has understood the main concept.",

        "Answer is relevant to the question."

      ],

      missingPoints: [

        "Answer can include more supporting details from the chapter."

      ],

      incorrectPoints: [],

      grammar:
        "Minor grammar improvements are suggested.",

      feedback:
        "Good answer. The student should add one or two more conceptual points for full marks.",

      improved:
        expected ||
        "Improved answer will be generated based on chapter knowledge."

    };

  }

};


// ------------------------------------------------------------
// MOCK PDF EXTRACTION
// ------------------------------------------------------------

const extractTextFromMockPDF =
  async (file) => {

    return new Promise(
      resolve =>

        setTimeout(
          () => {

            resolve(
              "Extracted text from " +
              file.name +
              ". This chapter contains concepts related to motion, distance, displacement, speed, velocity, uniform motion and non-uniform motion."
            );

          },
          800
        )

    );

  };


// ------------------------------------------------------------
// GLOBAL API
// ------------------------------------------------------------

const API = {

  auth: authAPI,

  directory: directoryAPI,

  reports: reportsAPI,

  submissions: submissionsAPI,

  tests: testsAPI,

  reportCards: reportCardsAPI,

  mcq: mcqAPI,

  chapters: chaptersAPI,

  papers: papersAPI,

  homework: homeworkAPI,

  backend: {

    getUrl: () =>
      BACKEND_URL,

    // generator-app.js's paper-generation call (and anything else that
    // needs a raw bearer token for a manual fetch, rather than going
    // through backendFetch()) relies on this. It was missing — only
    // getUrl existed — which is exactly what threw "API.backend.
    // getAccessToken is not a function" on the Test Paper Generator page.
    getAccessToken: () =>
      getAccessToken()

  }

};


window.API = API;