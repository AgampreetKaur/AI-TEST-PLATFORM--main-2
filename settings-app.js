class ErrorBoundary extends React.Component {
  constructor(props) { 
    super(props); 
    this.state = { hasError: false }; 
  }

  static getDerivedStateFromError(error) { 
    return { hasError: true }; 
  }

  render() { 
    return this.state.hasError ? <div>Error</div> : this.props.children; 
  }
}

function SettingsApp() {
  const [saving, setSaving] = React.useState(false);
  const [toast, setToast] = React.useState(null);

  const [groqKey, setGroqKey] = React.useState(() => localStorage.getItem("groq_api_key") || "");
  const [geminiKey, setGeminiKey] = React.useState(() => localStorage.getItem("gemini_api_key") || "");
  const [ocrKey, setOcrKey] = React.useState(() => localStorage.getItem("ocr_api_key") || "");
  const [aiModel, setAiModel] = React.useState(() => localStorage.getItem("ai_model") || "llama-3.1-8b-instant");
  const [ocrProvider, setOcrProvider] = React.useState(
  () => localStorage.getItem("ocr_provider") || "Tesseract"
);
  const [darkMode, setDarkMode] = React.useState(() => localStorage.getItem("dark_mode") === "true");
  const [autoSave, setAutoSave] = React.useState(() => localStorage.getItem("auto_save") !== "false");

  React.useEffect(() => {
    if (darkMode) {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }
  }, [darkMode]);

  const handleSave = () => {
    setSaving(true);

    localStorage.setItem("groq_api_key", groqKey);
    localStorage.setItem("gemini_api_key", geminiKey);
    localStorage.setItem("ocr_api_key", ocrKey);
    localStorage.setItem("ai_model", aiModel);
    localStorage.setItem("ocr_provider", ocrProvider);
    localStorage.setItem("dark_mode", darkMode.toString());
    localStorage.setItem("auto_save", autoSave.toString());

    setTimeout(() => {
      setSaving(false);
      setToast("Settings saved successfully!");
      setTimeout(() => setToast(null), 3000);
    }, 700);
  };

  return (
    <DashboardLayout title="System Settings">
  <div className="max-w-3xl space-y-6">

    <div className="card space-y-6">
      <h3 className="text-lg font-bold border-b pb-3 text-gray-900">
        API Configuration
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            AI Model Selection
          </label>

          <select
            className="input-field bg-gray-50 cursor-pointer"
            value={aiModel}
            onChange={(e) => setAiModel(e.target.value)}
          >
            <option value="gemini-2.5-flash">
  Gemini 2.5 Flash
</option>

<option value="gemini-1.5-flash">
  Gemini 1.5 Flash
</option>
          </select>
        </div>
        <div className="space-y-2">
  <label className="text-sm font-medium text-gray-700">
    OCR Provider
  </label>

  <select
    className="input-field bg-gray-50 cursor-pointer"
    value={ocrProvider}
    onChange={(e) => setOcrProvider(e.target.value)}
  >
    <option value="Tesseract">
      Tesseract Local
    </option>

    <option value="Manual Correction">
      Manual Correction
    </option>
  </select>
</div>

<div className="space-y-2">
  <label className="text-sm font-medium text-gray-700">
    Groq API Key
  </label>

  <input
    type="text"
    className="input-field"
    placeholder="gsk_..."
    value={groqKey}
    onChange={(e) => setGroqKey(e.target.value)}
  />
</div>

<div className="space-y-2">
  <label className="text-sm font-medium text-gray-700">
    Gemini API Key
  </label>

  <input
    type="text"
    className="input-field"
    placeholder="AIza..."
    value={geminiKey}
    onChange={(e) => setGeminiKey(e.target.value)}
  />
</div>

</div>
</div>
    <div className="card space-y-2">
      <h3 className="text-lg font-bold border-b pb-3 mb-4 text-gray-900">
        Application Preferences
      </h3>

      <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors">
        <div>
          <p className="font-medium text-gray-900">
            Dark Mode
          </p>

          <p className="text-sm text-gray-500">
            Enable dark theme for the dashboard
          </p>
        </div>

        <div
          className={`w-11 h-6 rounded-full relative cursor-pointer transition-colors ${
            darkMode
              ? "bg-[var(--primary)]"
              : "bg-gray-300"
          }`}
          onClick={() => setDarkMode(!darkMode)}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow transition-transform ${
              darkMode
                ? "right-0.5"
                : "left-0.5"
            }`}
          ></div>
        </div>
      </div>

      <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors border-t border-gray-100">
        <div>
          <p className="font-medium text-gray-900">
            Auto-save generated papers
          </p>

          <p className="text-sm text-gray-500">
            Automatically save generated paper sets
          </p>
        </div>

        <div
          className={`w-11 h-6 rounded-full relative cursor-pointer transition-colors ${
            autoSave
              ? "bg-[var(--primary)]"
              : "bg-gray-300"
          }`}
          onClick={() => setAutoSave(!autoSave)}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow transition-transform ${
              autoSave
                ? "right-0.5"
                : "left-0.5"
            }`}
          ></div>
        </div>
      </div>
    </div>

    <div className="flex justify-end gap-3 mt-8 border-t pt-4">
      <button
        className="btn-primary px-8"
        onClick={handleSave}
        disabled={saving}
      >
        {saving
          ? <div className="icon-loader animate-spin"></div>
          : <div className="icon-save"></div>
        }

        {saving ? "Saving..." : "Save Settings"}
      </button>
    </div>

    {toast && (
      <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-fade-in-up z-50">
        <div className="icon-circle-check text-green-400"></div>
        {toast}
      </div>
    )}

  </div>
</DashboardLayout>
);
}

const root = ReactDOM.createRoot(
  document.getElementById("root")
);

root.render(
  <ErrorBoundary>
    <SettingsApp />
  </ErrorBoundary>
);