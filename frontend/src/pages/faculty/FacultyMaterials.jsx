import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Plus,
  Download,
  Trash2,
  FileText,
  Search,
  X,
  AlertCircle,
  FolderOpen,
  FileCode,
  FileSpreadsheet,
  Image as ImageIcon,
  CheckCircle2,
} from 'lucide-react';
import api, { API_BASE_URL } from '../../api/client';

export const formatFileSize = (bytes) => {
  if (!bytes) return '1.2 MB';
  if (typeof bytes === 'string' && (bytes.includes('KB') || bytes.includes('MB') || bytes.includes('B'))) {
    return bytes;
  }
  const num = Number(bytes);
  if (isNaN(num)) return '1.2 MB';
  if (num < 1024) return `${num} B`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
  return `${(num / (1024 * 1024)).toFixed(1)} MB`;
};

export const getFileTypeInfo = (filename = '') => {
  const ext = (filename.split('.').pop() || '').toLowerCase();
  switch (ext) {
    case 'ipynb':
      return { badge: 'Jupyter Notebook', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' };
    case 'pdf':
      return { badge: 'PDF Document', color: 'bg-red-500/20 text-red-400 border-red-500/30' };
    case 'doc':
    case 'docx':
      return { badge: 'Word Document', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
    case 'ppt':
    case 'pptx':
      return { badge: 'PowerPoint Slides', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
    case 'xls':
    case 'xlsx':
      return { badge: 'Excel Sheet', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'webp':
      return { badge: 'Image File', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' };
    case 'py':
      return { badge: 'Python Script', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' };
    case 'zip':
    case 'rar':
      return { badge: 'ZIP Archive', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' };
    default:
      return { badge: ext ? `.${ext.toUpperCase()}` : 'Document', color: 'bg-slate-700 text-slate-300 border-slate-600' };
  }
};

export const FacultyMaterials = () => {
  const [materials, setMaterials] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject_id: '',
    category: 'Lecture Notes',
  });
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/materials', {
        params: { category: selectedCategory || undefined },
      });
      setMaterials(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchSubs = async () => {
      try {
        const res = await api.get('/api/attendance/subjects');
        setSubjects(res.data);
        if (res.data.length > 0) {
          setFormData((prev) => ({ ...prev, subject_id: res.data[0].id.toString() }));
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchMaterials();
    fetchSubs();
  }, [selectedCategory]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const typeInfo = getFileTypeInfo(file.name);
        setUploadFile({
          name: file.name,
          size: formatFileSize(file.size),
          badge: typeInfo.badge,
          color: typeInfo.color,
          base64: reader.result,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.subject_id || !uploadFile) {
      setUploadError('Please select a file and fill in required fields.');
      return;
    }

    setUploadLoading(true);
    setUploadError('');

    try {
      await api.post('/api/materials', {
        title: formData.title,
        description: formData.description,
        subject_id: parseInt(formData.subject_id, 10),
        category: formData.category,
        file_base64: uploadFile.base64,
        file_name: uploadFile.name,
        file_size: uploadFile.size,
      });
      setShowUploadModal(false);
      setFormData({
        title: '',
        description: '',
        subject_id: subjects[0]?.id?.toString() || '',
        category: 'Lecture Notes',
      });
      setUploadFile(null);
      fetchMaterials();
    } catch (err) {
      setUploadError(err.response?.data?.detail || 'Failed to upload study material.');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;
    try {
      await api.delete(`/api/materials/${id}`);
      fetchMaterials();
    } catch (err) {
      alert('Failed to delete material');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner */}
      <div className="p-6 md:p-8 rounded-3xl bg-[#0f172a] border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-semibold mb-2 border border-amber-500/20">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Study Materials Archive</span>
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold text-white">Course Materials & Notes</h2>
          <p className="text-xs text-slate-400 mt-1">
            Publish lecture slides, Jupyter notebooks (.ipynb), Word docs, PPTs, code, and syllabus guides
          </p>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-semibold text-xs shadow-lg shadow-amber-600/30 transition transform hover:-translate-y-0.5"
        >
          <Plus className="w-4 h-4" />
          <span>Upload Study Material</span>
        </button>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {['', 'Lecture Notes', 'Syllabus', 'Reference Book', 'Slides'].map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-xl transition ${
              selectedCategory === cat
                ? 'bg-amber-600 text-white font-semibold'
                : 'bg-[#0f172a] border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {cat || 'All Categories'}
          </button>
        ))}
      </div>

      {/* Materials Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full py-16 text-center text-slate-500">Loading materials...</div>
        ) : materials.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-500 p-8 rounded-3xl bg-[#0f172a] border border-slate-800">
            <FolderOpen className="w-10 h-10 text-slate-600 mx-auto mb-3 opacity-50" />
            <p className="font-semibold text-white">No materials uploaded in this category</p>
            <p className="text-xs text-slate-400 mt-1">Click "Upload Study Material" to share documents.</p>
          </div>
        ) : (
          materials.map((m) => {
            const fileInfo = getFileTypeInfo(m.file_name);
            return (
              <div
                key={m.id}
                className="p-6 rounded-3xl bg-[#0f172a] border border-slate-800/80 shadow-xl flex flex-col justify-between hover:border-slate-700 transition"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${fileInfo.color}`}>
                      {fileInfo.badge}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                        {m.category}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{m.file_size}</span>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-white line-clamp-2 mt-2">{m.title}</h3>
                  <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">{m.description}</p>

                  <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                    <span>Subject: <strong className="text-slate-200">{m.subject_code}</strong></span>
                    <span>Uploaded: {new Date(m.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
                  <a
                    href={`${API_BASE_URL}/api/materials/${m.id}/download`}
                    download={m.file_name}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition shadow"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-400" />
                    <span>Download File</span>
                  </a>

                  <button
                    onClick={() => handleDelete(m.id, m.title)}
                    className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0f172a] border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
              <div className="flex items-center gap-2 text-amber-400">
                <BookOpen className="w-5 h-5" />
                <h3 className="text-base font-bold text-white">Upload Study Material</h3>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="p-6 space-y-4 text-xs">
              {uploadError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Lab 04: PyTorch Deep Learning Hands-On Notebook"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Notes, references, chapter guidelines..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Subject *</label>
                  <select
                    value={formData.subject_id}
                    onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-white outline-none focus:border-amber-500"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.code} - {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-white outline-none focus:border-amber-500"
                  >
                    <option value="Lecture Notes">Lecture Notes</option>
                    <option value="Syllabus">Syllabus</option>
                    <option value="Reference Book">Reference Book</option>
                    <option value="Slides">Slides</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Course File Attachment *
                </label>
                <p className="text-[11px] text-slate-400 mb-2">
                  Select your lecture document, code file, slides, or notebook (.pdf, .ipynb, .docx, .pptx, etc.)
                </p>

                <input
                  type="file"
                  required
                  accept=".pdf,.ipynb,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.webp,.py,.txt,.zip,.rar"
                  onChange={handleFileChange}
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-amber-600 file:text-white hover:file:bg-amber-500 cursor-pointer bg-slate-900 border border-slate-700/80 rounded-xl p-1.5"
                />

                {uploadFile && (
                  <div className="mt-2.5 p-3 rounded-xl bg-slate-900/90 border border-slate-700/80 flex items-center justify-between">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${uploadFile.color}`}>
                        {uploadFile.badge}
                      </span>
                      <span className="text-xs text-slate-200 truncate font-mono">{uploadFile.name}</span>
                    </div>
                    <span className="text-xs text-slate-400 font-mono flex-shrink-0">{uploadFile.size}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadLoading}
                  className="px-5 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-semibold rounded-xl shadow-lg shadow-amber-600/30 transition disabled:opacity-50"
                >
                  {uploadLoading ? 'Uploading...' : 'Save Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
