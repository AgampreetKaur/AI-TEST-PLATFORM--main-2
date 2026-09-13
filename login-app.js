function LoginApp() {
    const [userType, setUserType] = React.useState(null);

    const [email, setEmail] = React.useState("");
    const [studentId, setStudentId] = React.useState("");
    const [password, setPassword] = React.useState("");

    // Parent authentication states
    const [showForgotPassword, setShowForgotPassword] = React.useState(false);
    const [forgotEmail, setForgotEmail] = React.useState("");
    const [forgotLoading, setForgotLoading] = React.useState(false);
    const [forgotMessage, setForgotMessage] = React.useState("");

    // Google parent profile completion
    const [showGoogleProfile, setShowGoogleProfile] = React.useState(false);

    const [googleProfile, setGoogleProfile] = React.useState({
        name: "",
        address: "",
        qualification: "",
        profession: "",
        spouse_name: "",
        spouse_details: ""
    });

    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState("");

    const backendUrl =
        window.BACKEND_URL || "http://127.0.0.1:8000";


    // ---------------------------------------------------------
    // CHECK EXISTING SESSION
    // ---------------------------------------------------------

    React.useEffect(() => {

        const checkExistingSession = async () => {

            try {

                // Student session
                const studentToken =
                    localStorage.getItem("student_access_token");

                const savedStudentId =
                    localStorage.getItem("student_id");

                if (studentToken && savedStudentId) {

                    window.location.href = "index.html";

                    return;
                }


                // Parent / Supabase session
                if (
                    typeof API !== "undefined" &&
                    API.auth &&
                    API.auth.getSession
                ) {

                    const session =
                        await API.auth.getSession();

                    if (session && session.user) {

                        const role =
                            session.user.user_metadata?.role;


                        // Student should go to student portal
                        if (role === "student") {

                            window.location.href =
                                "index.html";

                            return;
                        }


                        // -------------------------------------------------
                        // Parent session
                        // -------------------------------------------------

                        try {

                            // Check whether local parent profile exists.
                            // This is important for Google sign-in.
                            if (
                                API.directory &&
                                API.directory.getMe
                            ) {

                                await API.directory.getMe();

                                window.location.href =
                                    "parent-portal-updated.html";

                                return;
                            }

                        } catch (profileError) {

                            // Google-created parent may not have a
                            // local profile yet.
                            setGoogleProfile({
                                name:
                                    session.user.user_metadata?.full_name ||
                                    session.user.user_metadata?.name ||
                                    session.user.email?.split("@")[0] ||
                                    "",
                                address: "",
                                qualification: "",
                                profession: "",
                                spouse_name: "",
                                spouse_details: ""
                            });

                            setUserType("parent");
                            setShowGoogleProfile(true);

                        }
                    }
                }

            } catch (err) {

                console.warn(
                    "Existing session check failed:",
                    err
                );

            }

        };


        checkExistingSession();

    }, []);


    // ---------------------------------------------------------
    // SELECT USER TYPE
    // ---------------------------------------------------------

    const selectUserType = (type) => {

        setUserType(type);

        setError("");

        setEmail("");
        setStudentId("");
        setPassword("");

        setShowForgotPassword(false);
        setShowGoogleProfile(false);

        setForgotEmail("");
        setForgotMessage("");

    };


    // ---------------------------------------------------------
    // PARENT LOGIN
    // ---------------------------------------------------------

    const handleParentLogin = async (e) => {

        e.preventDefault();

        setLoading(true);
        setError("");

        try {

            if (!email.trim()) {

                throw new Error(
                    "Please enter your email."
                );

            }

            if (!password) {

                throw new Error(
                    "Please enter your password."
                );

            }


            if (
                typeof API === "undefined" ||
                !API.auth ||
                !API.auth.login
            ) {

                throw new Error(
                    "Authentication system is not loaded."
                );

            }


            await API.auth.login(
                email.trim(),
                password
            );


            // Parent portal
            window.location.href =
                "parent-portal-updated.html";


        } catch (err) {

            console.error(
                "Parent login error:",
                err
            );

            setError(
                err.message ||
                "Parent login failed."
            );

        } finally {

            setLoading(false);

        }

    };


    // ---------------------------------------------------------
    // GOOGLE PARENT LOGIN
    // ---------------------------------------------------------

    const handleGoogleLogin = async () => {

        setLoading(true);
        setError("");

        try {

            if (
    !window.SUPABASE_URL ||
    !window.SUPABASE_PUBLISHABLE_KEY
) {

                throw new Error(
                    "Supabase configuration is missing."
                );

            }


            if (!window.supabase) {

                throw new Error(
                    "Supabase library is not loaded."
                );

            }


            const supabase =
    window.supabase.createClient(
        window.SUPABASE_URL,
        window.SUPABASE_PUBLISHABLE_KEY
    );


            // After Google authentication, Supabase returns
            // the user to this same login page.
            const redirectTo =
                window.location.origin +
                window.location.pathname;


            const {
                error
            } =
                await supabase.auth.signInWithOAuth({

                    provider: "google",

                    options: {
                        redirectTo
                    }

                });


            if (error) {

                throw new Error(
                    error.message ||
                    "Google sign-in failed."
                );

            }

        } catch (err) {

            console.error(
                "Google login error:",
                err
            );

            setError(
                err.message ||
                "Google sign-in failed."
            );

            setLoading(false);

        }

    };


    // ---------------------------------------------------------
    // FORGOT PASSWORD
    // ---------------------------------------------------------

    const handleForgotPassword = async (e) => {

        e.preventDefault();

        setForgotLoading(true);
        setError("");
        setForgotMessage("");

        try {

            const cleanEmail =
                forgotEmail.trim();


            if (!cleanEmail) {

                throw new Error(
                    "Please enter your email address."
                );

            }


            if (
                typeof SUPABASE_URL === "undefined" ||
                typeof SUPABASE_PUBLISHABLE_KEY === "undefined"
            ) {

                throw new Error(
                    "Supabase configuration is missing."
                );

            }


            if (!window.supabase) {

                throw new Error(
                    "Supabase library is not loaded."
                );

            }


            const supabase =
                window.supabase.createClient(
                    SUPABASE_URL,
                    SUPABASE_PUBLISHABLE_KEY
                );


            const redirectTo =
                window.location.origin +
                window.location.pathname;


            const {
                error
            } =
                await supabase.auth.resetPasswordForEmail(
                    cleanEmail,
                    {
                        redirectTo
                    }
                );


            if (error) {

                throw new Error(
                    error.message ||
                    "Unable to send password reset email."
                );

            }


            setForgotMessage(
                "Password reset email sent. Please check your inbox."
            );

        } catch (err) {

            console.error(
                "Forgot password error:",
                err
            );

            setError(
                err.message ||
                "Unable to send password reset email."
            );

        } finally {

            setForgotLoading(false);

        }

    };


    // ---------------------------------------------------------
    // COMPLETE GOOGLE PARENT PROFILE
    // ---------------------------------------------------------

    const handleGoogleProfileSubmit = async (e) => {

        e.preventDefault();

        setLoading(true);
        setError("");

        try {

            const profile =
                googleProfile;


            if (!profile.name.trim()) {

                throw new Error(
                    "Please enter your full name."
                );

            }


            if (!profile.address.trim()) {

                throw new Error(
                    "Please enter your address."
                );

            }


            if (!profile.qualification.trim()) {

                throw new Error(
                    "Please enter your qualification."
                );

            }


            if (!profile.profession.trim()) {

                throw new Error(
                    "Please enter your profession."
                );

            }


            if (
                typeof API === "undefined" ||
                !API.directory ||
                !API.directory.createParent
            ) {

                throw new Error(
                    "Directory API is not loaded."
                );

            }


            await API.directory.createParent({

                name:
                    profile.name.trim(),

                address:
                    profile.address.trim(),

                qualification:
                    profile.qualification.trim(),

                profession:
                    profile.profession.trim(),

                spouse_name:
                    profile.spouse_name.trim(),

                spouse_details:
                    profile.spouse_details.trim()

            });


            // Store local authenticated user
            const session =
                await API.auth.getSession();


            if (
                session &&
                session.user
            ) {

                localStorage.setItem(
                    "auth_user",
                    JSON.stringify({

                        id:
                            session.user.id,

                        Name:
                            profile.name.trim(),

                        Email:
                            session.user.email || "",

                        Role:
                            "parent"

                    })
                );

            }


            window.location.href =
                "parent-portal-updated.html";


        } catch (err) {

            console.error(
                "Google profile completion error:",
                err
            );

            setError(
                err.message ||
                "Unable to complete parent profile."
            );

        } finally {

            setLoading(false);

        }

    };


    // ---------------------------------------------------------
    // STUDENT LOGIN
    // ---------------------------------------------------------

    const handleStudentLogin = async (e) => {

        e.preventDefault();

        setLoading(true);
        setError("");

        try {

            const cleanStudentId =
                studentId.trim();


            if (!cleanStudentId) {

                throw new Error(
                    "Please enter your Student ID."
                );

            }


            if (!password) {

                throw new Error(
                    "Please enter your temporary password."
                );

            }


            const response =
                await fetch(
                    `${backendUrl}/student-auth/login`,
                    {

                        method: "POST",

                        headers: {

                            "Content-Type":
                                "application/json",

                            "Accept":
                                "application/json"

                        },

                        body: JSON.stringify({

                            student_id:
                                cleanStudentId,

                            password:
                                password

                        })

                    }
                );


            let data = {};

            try {

                data =
                    await response.json();

            } catch (_) {

                data = {};

            }


            if (!response.ok) {

                throw new Error(
                    data.detail ||
                    "Invalid Student ID or password."
                );

            }


            if (
                !data.student ||
                !data.session ||
                !data.session.access_token
            ) {

                throw new Error(
                    "Student login succeeded but authentication session was not returned."
                );

            }


            // -------------------------------------------------
            // SAVE STUDENT SESSION
            // -------------------------------------------------

            localStorage.setItem(
                "student_access_token",
                data.session.access_token
            );


            if (data.session.refresh_token) {

                localStorage.setItem(
                    "student_refresh_token",
                    data.session.refresh_token
                );

            }


            // Student ID used by dashboard/API
            localStorage.setItem(
                "student_id",
                data.student.student_login_id
            );


            // Store authenticated student
            localStorage.setItem(
                "auth_user",
                JSON.stringify({

                    id:
                        data.student.id,

                    Name:
                        data.student.name ||
                        "Student",

                    Email:
                        data.student.email ||
                        "",

                    Role:
                        "Student",

                    StudentId:
                        data.student.student_login_id,

                    Grade:
                        data.student.grade ||
                        ""

                })
            );


            console.log(
                "Student login successful:",
                data.student.student_login_id
            );


            // -------------------------------------------------
            // GO TO EXISTING STUDENT PORTAL
            // -------------------------------------------------

            window.location.href =
                "index.html";


        } catch (err) {

            console.error(
                "Student login error:",
                err
            );

            setError(
                err.message ||
                "Student login failed."
            );

        } finally {

            setLoading(false);

        }

    };


    // ---------------------------------------------------------
    // USER TYPE SELECTION SCREEN
    // ---------------------------------------------------------

    if (!userType) {

        return (

            <div className="min-h-screen flex items-center justify-center p-4">

                <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8">

                    <div className="text-center mb-8">

                        <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-4">

                            <div className="icon-graduation-cap text-2xl text-[var(--primary)]"></div>

                        </div>

                        <h2 className="text-2xl font-bold">
                            Welcome
                        </h2>

                        <p className="text-gray-500 mt-2">
                            How would you like to sign in?
                        </p>

                    </div>


                    <div className="space-y-4">

                        <button
                            type="button"
                            onClick={() =>
                                selectUserType("parent")
                            }
                            className="w-full border border-gray-200 rounded-xl p-5 text-left hover:border-indigo-500 hover:bg-indigo-50 transition-all"
                        >

                            <div className="flex items-center gap-4">

                                <div className="w-11 h-11 bg-indigo-100 rounded-lg flex items-center justify-center">

                                    <div className="icon-users text-xl text-[var(--primary)]"></div>

                                </div>

                                <div>

                                    <div className="font-semibold text-lg">
                                        I'm a Parent
                                    </div>

                                    <div className="text-sm text-gray-500">
                                        Manage children, homework and reports
                                    </div>

                                </div>

                            </div>

                        </button>


                        <button
                            type="button"
                            onClick={() =>
                                selectUserType("student")
                            }
                            className="w-full border border-gray-200 rounded-xl p-5 text-left hover:border-indigo-500 hover:bg-indigo-50 transition-all"
                        >

                            <div className="flex items-center gap-4">

                                <div className="w-11 h-11 bg-indigo-100 rounded-lg flex items-center justify-center">

                                    <div className="icon-graduation-cap text-xl text-[var(--primary)]"></div>

                                </div>

                                <div>

                                    <div className="font-semibold text-lg">
                                        I'm a Student
                                    </div>

                                    <div className="text-sm text-gray-500">
                                        Access homework and track your progress
                                    </div>

                                </div>

                            </div>

                        </button>

                    </div>


                    <p className="text-center text-xs text-gray-400 mt-8">
                        AI Assessment & Homework Validation System
                    </p>

                </div>

            </div>

        );

    }


    // ---------------------------------------------------------
    // GOOGLE PROFILE COMPLETION SCREEN
    // ---------------------------------------------------------

    if (
        userType === "parent" &&
        showGoogleProfile
    ) {

        return (

            <div className="min-h-screen flex items-center justify-center p-4">

                <div className="max-w-lg w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8">

                    <div className="text-center mb-8">

                        <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-4">

                            <div className="icon-user text-2xl text-[var(--primary)]"></div>

                        </div>

                        <h2 className="text-2xl font-bold">
                            Complete Your Profile
                        </h2>

                        <p className="text-gray-500 mt-2">
                            Please provide a few details before entering the parent portal.
                        </p>

                    </div>


                    {error && (

                        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">
                            {error}
                        </div>

                    )}


                    <form
                        onSubmit={handleGoogleProfileSubmit}
                        className="space-y-4"
                    >

                        <div>

                            <label className="block text-sm font-medium mb-1">
                                Full Name
                            </label>

                            <input
                                type="text"
                                required
                                value={googleProfile.name}
                                onChange={(e) =>
                                    setGoogleProfile({
                                        ...googleProfile,
                                        name: e.target.value
                                    })
                                }
                                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--primary)] outline-none"
                                placeholder="Enter your full name"
                            />

                        </div>


                        <div>

                            <label className="block text-sm font-medium mb-1">
                                Address
                            </label>

                            <textarea
                                required
                                rows="2"
                                value={googleProfile.address}
                                onChange={(e) =>
                                    setGoogleProfile({
                                        ...googleProfile,
                                        address: e.target.value
                                    })
                                }
                                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--primary)] outline-none resize-none"
                                placeholder="Enter your address"
                            />

                        </div>


                        <div>

                            <label className="block text-sm font-medium mb-1">
                                Qualification
                            </label>

                            <input
                                type="text"
                                required
                                value={googleProfile.qualification}
                                onChange={(e) =>
                                    setGoogleProfile({
                                        ...googleProfile,
                                        qualification: e.target.value
                                    })
                                }
                                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--primary)] outline-none"
                                placeholder="e.g. MBA, B.Tech, M.Sc."
                            />

                        </div>


                        <div>

                            <label className="block text-sm font-medium mb-1">
                                Profession
                            </label>

                            <input
                                type="text"
                                required
                                value={googleProfile.profession}
                                onChange={(e) =>
                                    setGoogleProfile({
                                        ...googleProfile,
                                        profession: e.target.value
                                    })
                                }
                                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--primary)] outline-none"
                                placeholder="e.g. Teacher, Engineer, Business"
                            />

                        </div>


                        <div>

                            <label className="block text-sm font-medium mb-1">
                                Spouse Name
                            </label>

                            <input
                                type="text"
                                value={googleProfile.spouse_name}
                                onChange={(e) =>
                                    setGoogleProfile({
                                        ...googleProfile,
                                        spouse_name: e.target.value
                                    })
                                }
                                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--primary)] outline-none"
                                placeholder="Enter spouse name"
                            />

                        </div>


                        <div>

                            <label className="block text-sm font-medium mb-1">
                                Spouse Details
                            </label>

                            <textarea
                                rows="2"
                                value={googleProfile.spouse_details}
                                onChange={(e) =>
                                    setGoogleProfile({
                                        ...googleProfile,
                                        spouse_details: e.target.value
                                    })
                                }
                                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--primary)] outline-none resize-none"
                                placeholder="Profession or other relevant details"
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
                                ? "Saving Profile..."
                                : "Continue to Parent Portal"
                            }

                        </button>

                    </form>

                </div>

            </div>

        );

    }


    // ---------------------------------------------------------
    // FORGOT PASSWORD SCREEN
    // ---------------------------------------------------------

    if (
        userType === "parent" &&
        showForgotPassword
    ) {

        return (

            <div className="min-h-screen flex items-center justify-center p-4">

                <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8">

                    <button
                        type="button"
                        onClick={() => {

                            setShowForgotPassword(false);
                            setError("");
                            setForgotMessage("");

                        }}
                        className="text-sm text-gray-500 hover:text-indigo-600 mb-5"
                    >
                        ← Back to Parent Login
                    </button>


                    <div className="text-center mb-8">

                        <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-4">

                            <div className="icon-lock text-2xl text-[var(--primary)]"></div>

                        </div>

                        <h2 className="text-2xl font-bold">
                            Reset Password
                        </h2>

                        <p className="text-gray-500 mt-2">
                            Enter your parent account email and we'll send you a reset link.
                        </p>

                    </div>


                    {error && (

                        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">
                            {error}
                        </div>

                    )}


                    {forgotMessage && (

                        <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm mb-4">
                            {forgotMessage}
                        </div>

                    )}


                    <form
                        onSubmit={handleForgotPassword}
                        className="space-y-4"
                    >

                        <div>

                            <label className="block text-sm font-medium mb-1">
                                Email
                            </label>

                            <input
                                type="email"
                                required
                                autoComplete="email"
                                placeholder="Enter your email"
                                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--primary)] outline-none"
                                value={forgotEmail}
                                onChange={(e) =>
                                    setForgotEmail(
                                        e.target.value
                                    )
                                }
                            />

                        </div>


                        <button
                            type="submit"
                            disabled={forgotLoading}
                            className="w-full bg-[var(--primary)] text-white py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex justify-center items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                        >

                            {forgotLoading && (
                                <div className="icon-loader animate-spin"></div>
                            )}

                            {forgotLoading
                                ? "Sending..."
                                : "Send Reset Link"
                            }

                        </button>

                    </form>

                </div>

            </div>

        );

    }


    // ---------------------------------------------------------
    // PARENT LOGIN SCREEN
    // ---------------------------------------------------------

    if (userType === "parent") {

        return (

            <div className="min-h-screen flex items-center justify-center p-4">

                <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8">

                    <button
                        type="button"
                        onClick={() =>
                            selectUserType(null)
                        }
                        className="text-sm text-gray-500 hover:text-indigo-600 mb-5"
                    >
                        ← Change account type
                    </button>


                    <div className="text-center mb-8">

                        <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-4">

                            <div className="icon-users text-2xl text-[var(--primary)]"></div>

                        </div>

                        <h2 className="text-2xl font-bold">
                            Parent Login
                        </h2>

                        <p className="text-gray-500 mt-2">
                            Sign in to manage your children's progress
                        </p>

                    </div>


                    {error && (

                        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">

                            {error}

                        </div>

                    )}


                    <form
                        onSubmit={handleParentLogin}
                        className="space-y-4"
                    >

                        <div>

                            <label className="block text-sm font-medium mb-1">
                                Email
                            </label>

                            <input
                                type="email"
                                required
                                autoComplete="email"
                                placeholder="Enter your email"
                                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--primary)] outline-none"
                                value={email}
                                onChange={(e) =>
                                    setEmail(
                                        e.target.value
                                    )
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
                                placeholder="Enter your password"
                                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--primary)] outline-none"
                                value={password}
                                onChange={(e) =>
                                    setPassword(
                                        e.target.value
                                    )
                                }
                            />

                        </div>


                        <div className="text-right">

                            <button
                                type="button"
                                onClick={() => {

                                    setForgotEmail(email);
                                    setForgotMessage("");
                                    setError("");
                                    setShowForgotPassword(true);

                                }}
                                className="text-sm text-[var(--primary)] hover:underline"
                            >
                                Forgot Password?
                            </button>

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
                                ? "Signing In..."
                                : "Sign In as Parent"
                            }

                        </button>

                    </form>


                    <div className="flex items-center gap-3 my-5">

                        <div className="flex-1 border-t border-gray-200"></div>

                        <span className="text-xs text-gray-400">
                            OR
                        </span>

                        <div className="flex-1 border-t border-gray-200"></div>

                    </div>


                    <button
                        type="button"
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className="w-full border border-gray-300 bg-white text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors flex justify-center items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    >

                        <span className="font-bold text-lg">
                            G
                        </span>

                        Continue with Google

                    </button>


                    <p className="text-center text-sm text-gray-500 mt-4">

                        New parent?

                        <a
                            href="signup.html"
                            className="text-[var(--primary)] hover:underline ml-1"
                        >
                            Create Parent Account
                        </a>

                    </p>


                    <p className="text-center text-sm text-gray-500 mt-6">

                        Student?

                        <button
                            type="button"
                            onClick={() =>
                                selectUserType("student")
                            }
                            className="text-[var(--primary)] hover:underline ml-1"
                        >
                            Student Login
                        </button>

                    </p>

                </div>

            </div>

        );

    }


    // ---------------------------------------------------------
    // STUDENT LOGIN SCREEN
    // ---------------------------------------------------------

    return (

        <div className="min-h-screen flex items-center justify-center p-4">

            <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8">

                <button
                    type="button"
                    onClick={() =>
                        selectUserType(null)
                    }
                    className="text-sm text-gray-500 hover:text-indigo-600 mb-5"
                >
                    ← Change account type
                </button>


                <div className="text-center mb-8">

                    <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-4">

                        <div className="icon-graduation-cap text-2xl text-[var(--primary)]"></div>

                    </div>

                    <h2 className="text-2xl font-bold">
                        Student Login
                    </h2>

                    <p className="text-gray-500 mt-2">
                        Sign in using your Student ID
                    </p>

                </div>


                {error && (

                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">

                        {error}

                    </div>

                )}


                <form
                    onSubmit={handleStudentLogin}
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
                                setStudentId(
                                    e.target.value
                                )
                            }
                        />

                    </div>


                    <div>

                        <label className="block text-sm font-medium mb-1">
                            Temporary Password
                        </label>

                        <input
                            type="password"
                            required
                            autoComplete="current-password"
                            placeholder="Enter your temporary password"
                            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--primary)] outline-none"
                            value={password}
                            onChange={(e) =>
                                setPassword(
                                    e.target.value
                                )
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
                            ? "Signing In..."
                            : "Sign In as Student"
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

                        <button
                            type="button"
                            onClick={() =>
                                selectUserType("parent")
                            }
                            className="text-[var(--primary)] hover:underline ml-1"
                        >
                            Parent Login
                        </button>

                    </p>

                </div>

            </div>

        </div>

    );

}


// -------------------------------------------------------------
// RENDER
// -------------------------------------------------------------

const root =
    ReactDOM.createRoot(
        document.getElementById("root")
    );


root.render(
    <LoginApp />
);