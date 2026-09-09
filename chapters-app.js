class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, errorInfo) { console.error("Error:", error); }
  render() {
    if (this.state.hasError) {
      return <div className="p-8 text-center text-red-500">Something went wrong loading this page.</div>;
    }
    return this.props.children;
  }
}

function ChaptersApp() {
  try {
    const defaultChapters = [
      { id: 1, name: "Motion", subject: "Physics", class: "Class 9", status: "Processed", date: "2026-06-01" },
      { id: 2, name: "Atmosphere and Climate", subject: "Geography", class: "Class 10", status: "Processed", date: "2026-06-03" },
      { id: 3, name: "Chemical Bonding", subject: "Chemistry", class: "Class 11", status: "Processing", date: "2026-06-05" }
    ];

    const [chapters, setChapters] = React.useState(() => {
      const saved = localStorage.getItem("chapters");
      return saved ? JSON.parse(saved) : defaultChapters;
    });

    const [showUploadModal, setShowUploadModal] = React.useState(false);
    const [uploading, setUploading] = React.useState(false);
    const [toast, setToast] = React.useState(null);

    const [selectedFile, setSelectedFile] = React.useState(null);
    const [chapterName, setChapterName] = React.useState("");
    const [subject, setSubject] = React.useState("Physics");
    const [classLevel, setClassLevel] = React.useState("Class 9");

    const fileInputRef = React.useRef(null);

    const showToast = (message) => {
      setToast(message);
      setTimeout(() => setToast(null), 3000);
    };
    const extractTextFromPDF = async (file) => {

  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

  const arrayBuffer = await file.arrayBuffer();

  const pdf = await pdfjsLib.getDocument({
    data: arrayBuffer
  }).promise;
  console.log("TOTAL PAGES:", pdf.numPages);

  let fullText = "";

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {

    showToast(`OCR Processing Page ${pageNumber}/${pdf.numPages}`);

    const page = await pdf.getPage(pageNumber);

    const viewport = page.getViewport({
      scale: 2.5
    });

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({
      canvasContext: context,
      viewport
    }).promise;

    const imageData = canvas.toDataURL("image/png");

    const result = await Tesseract.recognize(
      imageData,
      "eng",
      {
        logger: m => console.log(m)
      }
    );

    fullText +=
      "\n\nPAGE " +
      pageNumber +
      "\n" +
      result.data.text;
  }
console.log("TOTAL EXTRACTED LENGTH:", fullText.length);
console.log("LAST 500 CHARS:");
console.log(fullText.slice(-500));
  return fullText;
};

    const saveChapters = (updatedChapters) => {
      setChapters(updatedChapters);
      localStorage.setItem("chapters", JSON.stringify(updatedChapters));
    };

    const handleFileChange = (event) => {
      const file = event.target.files[0];
      if (!file) return;

      if (file.type !== "application/pdf") {
        showToast("Please upload a PDF file only.");
        return;
      }

      setSelectedFile(file);
      setChapterName(file.name.replace(".pdf", "").replaceAll("_", " "));
    };

     const handleUpload = async () => {
  if (!selectedFile) {
    showToast("Please select a PDF file first.");
    return;
  }

  setUploading(true);

  try {
    const extractedText = await extractTextFromPDF(selectedFile);
    alert(
  "Pages extracted successfully\n\n" +
  "Length: " + extractedText.length
);

    if (!extractedText || extractedText.length < 50) {
      showToast("Could not extract enough text from PDF.");
      setUploading(false);
      return;
    }
    console.log("TOTAL EXTRACTED LENGTH:", extractedText.length);
console.log("LAST 1000 CHARS:");
console.log(extractedText.slice(-1000));
    const newChapter = {
      id: Date.now(),
      name: chapterName || selectedFile.name.replace(".pdf", ""),
      subject,
      class: classLevel,
      status: "Processed",
      date: new Date().toISOString().split("T")[0],
      text: extractedText,
      summary: extractedText.substring(0, 3000)
    };

    const updatedChapters = [newChapter, ...chapters];
    saveChapters(updatedChapters);

    setUploading(false);
    setShowUploadModal(false);
    setSelectedFile(null);
    setChapterName("");

    showToast("PDF text extracted and chapter saved successfully!");
  } catch (error) {
    console.error(error);
    setUploading(false);
    showToast("PDF extraction failed. Check console.");
  }
};

    const handleDelete = (id) => {
      const updatedChapters = chapters.filter((chapter) => chapter.id !== id);
      saveChapters(updatedChapters);
      showToast("Chapter deleted successfully.");
    };

    return (
      <DashboardLayout title="Chapter Management">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="relative w-96">
              <div className="icon-search absolute left-3 top-2.5 text-gray-400"></div>
              <input
                type="text"
                placeholder="Search chapters..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--primary)] focus:outline-none"
              />
            </div>

            <button className="btn-primary" onClick={() => setShowUploadModal(true)}>
              <div className="icon-upload"></div> Upload PDF
            </button>
          </div>

          <div className="card">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-[var(--border-color)]">
                    <th className="px-6 py-4 font-medium text-gray-500 text-sm">Chapter Name</th>
                    <th className="px-6 py-4 font-medium text-gray-500 text-sm">Subject</th>
                    <th className="px-6 py-4 font-medium text-gray-500 text-sm">Class</th>
                    <th className="px-6 py-4 font-medium text-gray-500 text-sm">Upload Date</th>
                    <th className="px-6 py-4 font-medium text-gray-500 text-sm">Status</th>
                    <th className="px-6 py-4 font-medium text-gray-500 text-sm text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[var(--border-color)]">
                  {chapters.map((chapter) => (
                    <tr key={chapter.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{chapter.name}</td>
                      <td className="px-6 py-4 text-gray-600">{chapter.subject}</td>
                      <td className="px-6 py-4 text-gray-600">{chapter.class}</td>
                      <td className="px-6 py-4 text-gray-600">{chapter.date}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          chapter.status === "Processed" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                        }`}>
                          {chapter.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button className="text-gray-400 hover:text-[var(--primary)] transition-colors">
                          <div className="icon-eye text-lg"></div>
                        </button>
                        <button className="text-gray-400 hover:text-blue-600 transition-colors">
                          <div className="icon-pencil text-lg"></div>
                        </button>
                        <button
                          onClick={() => handleDelete(chapter.id)}
                          className="text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <div className="icon-trash text-lg"></div>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {showUploadModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">Upload Chapter PDF</h3>
                <button onClick={() => setShowUploadModal(false)} className="text-gray-400 hover:text-gray-600">
                  <div className="icon-x text-xl"></div>
                </button>
              </div>

              <div className="space-y-4">
                <input
                  type="file"
                  accept="application/pdf"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div
                  onClick={() => fileInputRef.current.click()}
                  className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <div className="icon-cloud-upload text-4xl text-[var(--primary)] mb-3 mx-auto w-12 h-12 flex items-center justify-center"></div>
                  <p className="font-medium text-gray-900">
                    {selectedFile ? selectedFile.name : "Click to upload or drag and drop"}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">PDF files only (max 50MB)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Chapter Name</label>
                  <input
                    type="text"
                    value={chapterName}
                    onChange={(e) => setChapterName(e.target.value)}
                    placeholder="Enter chapter name"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                    <select
  value={subject}
  onChange={(e) => setSubject(e.target.value)}
  className="w-full border border-gray-300 rounded-lg px-3 py-2"
>
  <option>Mathematics</option>
  <option>Physics</option>
  <option>Chemistry</option>
  <option>Biology</option>
  <option>Geography</option>
  <option>History</option>
  <option>Civics</option>
  <option>Economics</option>
  <option>Hindi</option>
  <option>English</option>
  
</select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                    <select
                      value={classLevel}
                      onChange={(e) => setClassLevel(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    >
                      <option>Class 9</option>
                      <option>Class 10</option>
                      <option>Class 11</option>
                      <option>Class 12</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <button onClick={() => setShowUploadModal(false)} className="btn-secondary" disabled={uploading}>
                  Cancel
                </button>
                <button className="btn-primary" onClick={handleUpload} disabled={uploading}>
                  {uploading ? <div className="icon-loader animate-spin"></div> : <div className="icon-cloud-upload"></div>}
                  {uploading ? "Processing..." : "Upload & Extract"}
                </button>
              </div>
            </div>
          </div>
        )}

        {toast && (
          <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-fade-in-up">
            <div className="icon-circle-check text-green-400"></div>
            {toast}
          </div>
        )}
      </DashboardLayout>
    );
  } catch (error) {
    console.error("ChaptersApp error:", error);
    return null;
  }
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<ErrorBoundary><ChaptersApp /></ErrorBoundary>);