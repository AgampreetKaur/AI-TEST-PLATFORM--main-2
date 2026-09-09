function StudentLoginApp() {
    const [studentId, setStudentId] = React.useState("");
    const [password, setPassword] = React.useState("");

    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState("");

    const handleLogin = async (e) => {
        e.preventDefault();

        setLoading(true);
        setError("");

        try {
            const cleanStudentId = studentId.trim();

            if (!cleanStudentId) {
                throw new Error("Student ID is required.");
            }

            if (!password) {
                throw new Error("Password is required.");
            }

            // ---------------------------------------------------------
            // 1. Authenticate student through backend
            // ---------------------------------------------------------

            const response = await fetch(
                `${window.BACKEND_URL || "http://127.0.0.1:8000"}/student-auth/login`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                    },

                    body: JSON.stringify({
                        student_id: cleanStudentId,
                        password: password,
                    }),
                }
            );

            let data = null;

            try {
                data = await response.json();
            } catch {
                throw new Error(
                    `Student login failed (${response.status}).`
                );
            }

            if (!response.ok) {
                throw new Error(
                    data?.detail ||
                    "Invalid Student ID or password."
                );
            }

            // ---------------------------------------------------------
            // 2. Validate backend response
            // ---------------------------------------------------------

            if (
                !data ||
                !data.student ||
                !data.session ||
                !data.session.access_token
            ) {
                throw new Error(
                    "Student login succeeded but authentication session was not returned."
                );
            }

            const student = data.student;
            const accessToken = data.session.access_token;
            const refreshToken = data.session.refresh_token;

            // ---------------------------------------------------------
            // 3. Save student information
            // ---------------------------------------------------------

            localStorage.setItem(
                "student_id",
                student.student_login_id
            );

            localStorage.setItem(
                "auth_user",
                JSON.stringify({
                    id: student.id,
                    Name: student.name || "Student",
                    Email: student.email,
                    Role: "Student",
                    StudentId: student.student_login_id,
                    Grade: student.grade,
                })
            );

            // Keep these as backup values.
            localStorage.setItem(
                "student_access_token",
                accessToken
            );

            if (refreshToken) {
                localStorage.setItem(
                    "student_refresh_token",
                    refreshToken
                );
            }

            // ---------------------------------------------------------
            // 4. IMPORTANT
            //
            // Put the backend-issued JWT into the Supabase client
            // session so API.auth.getAccessToken() and backendFetch()
            // can use the same authenticated student session.
            // ---------------------------------------------------------

            if (
                typeof window.supabase === "undefined" ||
                typeof window.supabase.createClient !== "function"
            ) {
                throw new Error(
                    "Supabase library is not loaded. Check student-login.html."
                );
            }

            if (
                typeof SUPABASE_URL === "undefined" ||
                typeof SUPABASE_PUBLISHABLE_KEY === "undefined"
            ) {
                throw new Error(
                    "Supabase configuration is missing. Check config.js."
                );
            }

            const studentSupabase =
                window.supabase.createClient(
                    SUPABASE_URL,
                    SUPABASE_PUBLISHABLE_KEY
                );

            const { error: sessionError } =
                await studentSupabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken,
                });

            if (sessionError) {
                console.error(
                    "Student Supabase session error:",
                    sessionError
                );

                throw new Error(
                    "Student login succeeded, but the authenticated session could not be created."
                );
            }

            // ---------------------------------------------------------
            // 5. Verify that Supabase now has the student session
            // ---------------------------------------------------------

            const {
                data: sessionData,
                error: verifyError,
            } = await studentSupabase.auth.getSession();

            if (verifyError || !sessionData?.session) {
                console.error(
                    "Student session verification failed:",
                    verifyError
                );

                throw new Error(
                    "Student session could not be verified."
                );
            }

            console.log(
                "STUDENT LOGIN SUCCESS:",
                sessionData.session.user
            );

            console.log(
                "STUDENT ID:",
                student.student_login_id
            );

            // ---------------------------------------------------------
            // 6. Open existing student dashboard
            // ---------------------------------------------------------

            window.location.href = "index.html";

        } catch (err) {

            console.error(
                "Student login error:",
                err
            );

            setError(
                err?.message ||
                "Student login failed."
            );

        } finally {

            setLoading(false);

        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">

            <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8">

                <div className="text-center mb-8">

                    <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-4">

                        <div className="icon-graduation-cap text-2xl text-[var(--primary)]"></div>

                    </div>

                    <h2 className="text-2xl font-bold">
                        Student Login
                    </h2>

                    <p className="text-gray-500 mt-2">
                        Login to access your homework and progress
                    </p>

                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">
                        {error}
                    </div>
                )}

                <form
                    onSubmit={handleLogin}
                    className="space-y-4"
                >

                    <div>

                        <label className="block text-sm font-medium mb-1">
                            Student ID
                        </label>

                        <input
                            type="text"
                            required
                            autoComplete="username"
                            placeholder="Enter your Student ID"
                            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--primary)] outline-none"
                            value={studentId}
                            onChange={(e) =>
                                setStudentId(e.target.value)
                            }
                        />

                    </div>

                    <div>

                        <label className="block text-sm font-medium mb-1">
                            Password
                        </label>

                        <input
                            type="password"
                            required
                            autoComplete="current-password"
                            placeholder="Enter your temporary password"
                            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--primary)] outline-none"
                            value={password}
                            onChange={(e) =>
                                setPassword(e.target.value)
                            }
                        />

                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[var(--primary)] text-white py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex justify-center items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    >

                        {loading && (
                            <div className="icon-loader animate-spin"></div>
                        )}

                        {loading
                            ? "Signing in..."
                            : "Sign In"
                        }

                    </button>

                </form>

                <div className="text-center text-sm text-gray-500 mt-6">

                    <p>
                        Your Student ID and temporary password
                        are provided by your parent.
                    </p>

                    <p className="mt-3">

                        Parent?

                        <a
                            href="login.html"
                            className="text-[var(--primary)] hover:underline ml-1"
                        >
                            Parent Login
                        </a>

                    </p>

                </div>

            </div>

        </div>
    );
}


const root =
    ReactDOM.createRoot(
        document.getElementById("root")
    );


root.render(
    <StudentLoginApp />
);