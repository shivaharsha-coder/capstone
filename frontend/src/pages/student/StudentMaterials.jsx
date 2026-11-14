import React, { useState, useEffect } from 'react';
import { BookOpen, Download, Search, FolderOpen } from 'lucide-react';
import api, { API_BASE_URL } from '../../api/client';
import { getFileTypeInfo } from '../faculty/FacultyMaterials';

export const StudentMaterials = () => {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => {
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
    fetchMaterials();
  }, [selectedCategory]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner */}
      <div className="p-6 md:p-8 rounded-3xl bg-[#0f172a] border border-slate-800 shadow-xl">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-semibold mb-2 border border-amber-500/20">
          <BookOpen className="w-3.5 h-3.5" />
          <span>Course Knowledge Archive</span>
        </div>
        <h2 className="text-xl md:text-2xl font-extrabold text-white">Study Materials & Notes</h2>
        <p className="text-xs text-slate-400 mt-1">
          Download lecture notes, Jupyter notebooks (.ipynb), slides, Word docs, code, and syllabus guides provided by faculty
        </p>
      </div>

      {/* Category Filter */}
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
            {cat || 'All Materials'}
          </button>
        ))}
      </div>

      {/* Materials Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full py-16 text-center text-slate-500 text-xs">
            Loading course study materials...
          </div>
        ) : materials.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-500 p-8 rounded-3xl bg-[#0f172a] border border-slate-800 text-xs">
            <FolderOpen className="w-10 h-10 text-slate-600 mx-auto mb-3 opacity-50" />
            <p className="font-semibold text-white">No materials found in this category</p>
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
                    <span>Faculty: <strong className="text-slate-300">{m.faculty_name}</strong></span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800">
                  <a
                    href={`${API_BASE_URL}/api/materials/${m.id}/download`}
                    download={m.file_name}
                    className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700 transition shadow"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-400" />
                    <span>Download File</span>
                  </a>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
