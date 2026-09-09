function DashboardLayout({ children, title }) {

    const [sidebarOpen, setSidebarOpen] = React.useState(false);

    React.useEffect(() => {

        // =====================================================
        // STUDENT AUTH CHECK
        // =====================================================
        //
        // Student login is handled by:
        //
        // /student-auth/login
        //
        // The backend returns a JWT which is stored in:
        //
        // student_access_token
        //
        // Therefore DO NOT call:
        //
        // API.auth.checkAuth()
        //
        // because that belongs to the old Supabase frontend
        // session flow.
        //

        const studentToken =
            localStorage.getItem(
                "student_access_token"
            );

        const studentId =
            localStorage.getItem(
                "student_id"
            );

        const authUserRaw =
            localStorage.getItem(
                "auth_user"
            );


        // -----------------------------------------------------
        // If this is the student portal and there is no
        // student session, send the user to the common login.
        // -----------------------------------------------------

        if (
            !studentToken ||
            !studentId
        ) {

            console.warn(
                "Student session not found. Redirecting to login."
            );

            window.location.href =
                "login.html";

            return;
        }


        // -----------------------------------------------------
        // Optional session information
        // -----------------------------------------------------

        if (authUserRaw) {

            try {

                const authUser =
                    JSON.parse(
                        authUserRaw
                    );

                console.log(
                    "Student session:",
                    authUser
                );

            } catch (error) {

                console.warn(
                    "Could not parse student auth_user:",
                    error
                );

            }

        }


        // =====================================================
        // DARK MODE
        // =====================================================

        const isDark =
            localStorage.getItem(
                "darkMode"
            ) === "true";


        if (isDark) {

            document.documentElement.classList.add(
                "dark"
            );


            document.documentElement.style.setProperty(
                "--bg-body",
                "#0f172a"
            );


            document.documentElement.style.setProperty(
                "--text-main",
                "#f8fafc"
            );


            document.documentElement.style.setProperty(
                "--bg-sidebar",
                "#1e293b"
            );

        } else {

            document.documentElement.classList.remove(
                "dark"
            );


            document.documentElement.style.setProperty(
                "--bg-body",
                "#f8fafc"
            );


            document.documentElement.style.setProperty(
                "--text-main",
                "#0f172a"
            );


            document.documentElement.style.setProperty(
                "--bg-sidebar",
                "#ffffff"
            );

        }

    }, []);


    // =========================================================
    // LOGOUT
    // =========================================================

    const handleLogout = () => {

        // Remove student-specific authentication.

        localStorage.removeItem(
            "student_id"
        );

        localStorage.removeItem(
            "student_access_token"
        );

        localStorage.removeItem(
            "student_refresh_token"
        );

        localStorage.removeItem(
            "auth_user"
        );


        // Go back to common login.

        window.location.href =
            "login.html";
    };


    // =========================================================
    // LAYOUT
    // =========================================================

    return (

        <div
            className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] transition-colors duration-200"
            data-name="dashboard-layout"
            data-file="layouts/DashboardLayout.js"
        >

            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <div className="md:pl-64 flex flex-col min-h-screen">

                <Header
                    title={title}
                    onMenuClick={() => setSidebarOpen(true)}
                />

                <main className="flex-1 p-4 md:p-8">

                    {children}

                </main>


                <footer
                    className="py-4 text-center text-sm text-gray-500 border-t border-[var(--border-color)] bg-white mt-auto"
                >

                    &copy; 2026 AI Test Paper & Homework Validation System.
                    All rights reserved.

                </footer>

            </div>

        </div>

    );
}