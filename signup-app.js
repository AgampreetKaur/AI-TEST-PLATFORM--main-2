function SignupApp() {
    const [name, setName] = React.useState('');
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
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

        try {
            const user = await API.auth.signup(
                name.trim(),
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
        <div className="min-h-screen flex items-center justify-center p-4">

            <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8">

                <div className="text-center mb-8">

                    <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-4">

                        <div className="icon-user-plus text-2xl text-[var(--primary)]"></div>

                    </div>

                    <h2 className="text-2xl font-bold">
                        Create Account
                    </h2>

                    <p className="text-gray-500 mt-2">
                        Join the AI Assessment System
                    </p>

                </div>


                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">
                        {error}
                    </div>
                )}


                {message && (
                    <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm mb-4">
                        {message}
                    </div>
                )}


                <form
                    onSubmit={handleSignup}
                    className="space-y-4"
                >

                    <div>

                        <label className="block text-sm font-medium mb-1">
                            Full Name
                        </label>

                        <input
                            type="text"
                            required
                            autoComplete="name"
                            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--primary)] outline-none"
                            value={name}
                            onChange={e =>
                                setName(e.target.value)
                            }
                        />

                    </div>


                    <div>

                        <label className="block text-sm font-medium mb-1">
                            Email
                        </label>

                        <input
                            type="email"
                            required
                            autoComplete="email"
                            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--primary)] outline-none"
                            value={email}
                            onChange={e =>
                                setEmail(e.target.value)
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
                            minLength="6"
                            autoComplete="new-password"
                            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--primary)] outline-none"
                            value={password}
                            onChange={e =>
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
                            ? 'Creating Account...'
                            : 'Sign Up'
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