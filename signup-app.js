function SignupApp() {
    const [name, setName] = React.useState('');
    const [address, setAddress] = React.useState('');
    const [qualification, setQualification] = React.useState('');
    const [profession, setProfession] = React.useState('');
    const [spouseName, setSpouseName] = React.useState('');
    const [spouseDetails, setSpouseDetails] = React.useState('');
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [confirmPassword, setConfirmPassword] = React.useState('');

    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState('');
    const [message, setMessage] = React.useState('');

    React.useEffect(() => {
        const checkExistingSession = async () => {
            try {
                const session = await API.auth.getSession();

                if (session) {
                    window.location.href = 'index.html';
                }
            } catch (err) {
                console.error('Session check failed:', err);
            }
        };

        checkExistingSession();
    }, []);

    const handleSignup = async (e) => {
        e.preventDefault();

        setLoading(true);
        setError('');
        setMessage('');

        // --------------------------------------------------------
        // PASSWORD VALIDATION
        // --------------------------------------------------------

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            setLoading(false);
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters long.');
            setLoading(false);
            return;
        }

        try {
            const user = await API.auth.signup(
                name.trim(),
                address.trim(),
                qualification.trim(),
                profession.trim(),
                spouseName.trim(),
                spouseDetails.trim(),
                email.trim(),
                password
            );

            if (user.RequiresEmailVerification) {
                setMessage(
                    'Account created successfully. Please verify your email, then sign in.'
                );
                return;
            }

            window.location.href = 'index.html';

        } catch (err) {

            console.error('Signup error:', err);

            setError(
                err.message || 'Signup failed'
            );

        } finally {

            setLoading(false);

        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">

            <div className="max-w-lg w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8">

                <div className="text-center mb-8">

                    <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-4">

                        <div className="icon-user-plus text-2xl text-[var(--primary)]"></div>

                    </div>

                    <h2 className="text-2xl font-bold">
                        Create Parent Account
                    </h2>

                    <p className="text-gray-500 mt-2">
                        Register to manage your child's academic progress
                    </p>

                </div>


                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-sm mb-4">
                        {error}
                    </div>
                )}


                {message && (
                    <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-lg text-sm mb-4">
                        {message}
                    </div>
                )}


                <form
                    onSubmit={handleSignup}
                    className="space-y-4"
                >

                    {/* FULL NAME */}

                    <div>

                        <label className="block text-sm font-medium mb-1">
                            Full Name
                        </label>

                        <input
                            type="text"
                            required
                            autoComplete="name"
                            placeholder="Enter your full name"
                            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--primary)] outline-none"
                            value={name}
                            onChange={e =>
                                setName(e.target.value)
                            }
                        />

                    </div>


                    {/* ADDRESS */}

                    <div>

                        <label className="block text-sm font-medium mb-1">
                            Address
                        </label>

                        <textarea
                            required
                            rows="2"
                            autoComplete="street-address"
                            placeholder="Enter your address"
                            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--primary)] outline-none resize-none"
                            value={address}
                            onChange={e =>
                                setAddress(e.target.value)
                            }
                        />

                    </div>


                    {/* QUALIFICATION */}

                    <div>

                        <label className="block text-sm font-medium mb-1">
                            Qualification
                        </label>

                        <input
                            type="text"
                            required
                            placeholder="e.g. MBA, B.Tech, M.Sc."
                            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--primary)] outline-none"
                            value={qualification}
                            onChange={e =>
                                setQualification(e.target.value)
                            }
                        />

                    </div>


                    {/* PROFESSION */}

                    <div>

                        <label className="block text-sm font-medium mb-1">
                            Profession
                        </label>

                        <input
                            type="text"
                            required
                            placeholder="e.g. Teacher, Engineer, Business"
                            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--primary)] outline-none"
                            value={profession}
                            onChange={e =>
                                setProfession(e.target.value)
                            }
                        />

                    </div>


                    {/* SPOUSE NAME */}

                    <div>

                        <label className="block text-sm font-medium mb-1">
                            Spouse Name
                        </label>

                        <input
                            type="text"
                            placeholder="Enter spouse name"
                            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--primary)] outline-none"
                            value={spouseName}
                            onChange={e =>
                                setSpouseName(e.target.value)
                            }
                        />

                    </div>


                    {/* SPOUSE DETAILS */}

                    <div>

                        <label className="block text-sm font-medium mb-1">
                            Spouse Details
                        </label>

                        <textarea
                            rows="2"
                            placeholder="Profession or other relevant details"
                            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--primary)] outline-none resize-none"
                            value={spouseDetails}
                            onChange={e =>
                                setSpouseDetails(e.target.value)
                            }
                        />

                    </div>


                    {/* EMAIL */}

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
                            onChange={e =>
                                setEmail(e.target.value)
                            }
                        />

                    </div>


                    {/* PASSWORD */}

                    <div>

                        <label className="block text-sm font-medium mb-1">
                            Password
                        </label>

                        <input
                            type="password"
                            required
                            minLength="6"
                            autoComplete="new-password"
                            placeholder="Minimum 6 characters"
                            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--primary)] outline-none"
                            value={password}
                            onChange={e =>
                                setPassword(e.target.value)
                            }
                        />

                    </div>


                    {/* CONFIRM PASSWORD */}

                    <div>

                        <label className="block text-sm font-medium mb-1">
                            Confirm Password
                        </label>

                        <input
                            type="password"
                            required
                            minLength="6"
                            autoComplete="new-password"
                            placeholder="Re-enter your password"
                            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--primary)] outline-none"
                            value={confirmPassword}
                            onChange={e =>
                                setConfirmPassword(e.target.value)
                            }
                        />

                    </div>


                    {/* SUBMIT */}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[var(--primary)] text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex justify-center items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    >

                        {loading && (
                            <div className="icon-loader animate-spin"></div>
                        )}

                        {loading
                            ? 'Creating Account...'
                            : 'Create Parent Account'
                        }

                    </button>

                </form>


                <p className="text-center text-sm text-gray-500 mt-6">

                    Already have an account?

                    {' '}

                    <a
                        href="login.html"
                        className="text-[var(--primary)] hover:underline"
                    >
                        Sign in
                    </a>

                </p>

            </div>

        </div>
    );
}


const root =
    ReactDOM.createRoot(
        document.getElementById('root')
    );


root.render(
    <SignupApp />
);