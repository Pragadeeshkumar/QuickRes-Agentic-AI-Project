import React, { useState, useEffect } from 'react';
import { BookOpen, Search, ShieldCheck, Tag, FileText, ExternalLink, Cpu } from 'lucide-react';

export default function KnowledgeBaseView() {
  const [articles, setArticles] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  useEffect(() => {
    fetch('/api/kb')
      .then(res => res.json())
      .then(data => setArticles(data))
      .catch(err => console.error("Error loading KB:", err));
  }, []);

  const categories = ['ALL', 'SUBSCRIPTION', 'REFUND', 'SHIPPING', 'ACCOUNT'];

  const filteredArticles = articles.filter(a => {
    const matchesCat = selectedCategory === 'ALL' || a.category.toUpperCase() === selectedCategory.toUpperCase();
    const matchesSearch = search === '' || 
      a.title.toLowerCase().includes(search.toLowerCase()) || 
      a.content.toLowerCase().includes(search.toLowerCase()) ||
      (a.policy_tags && a.policy_tags.toLowerCase().includes(search.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                <BookOpen className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-lg font-bold text-white">Company Knowledge Base & Policy SOPs</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Vector-indexed Standard Operating Procedures (SOPs) utilized by LangGraph Agentic RAG for policy reflection and gating.
                </p>
              </div>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search policy rules, tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center space-x-2 mt-4 pt-4 border-t border-slate-800/80 text-xs">
          <span className="text-slate-400 font-semibold text-[11px] uppercase">Domain:</span>
          {categories.map(c => (
            <button
              key={c}
              onClick={() => setSelectedCategory(c)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                selectedCategory === c
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Articles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredArticles.map(art => (
          <div key={art.id} className="glass-panel p-5 rounded-2xl border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-950/60 border border-indigo-800/40 px-2 py-0.5 rounded">
                  {art.id}
                </span>
                <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                  {art.category}
                </span>
              </div>

              <h3 className="text-sm font-bold text-white mb-2 leading-snug">
                {art.title}
              </h3>

              <div className="text-xs text-slate-300 whitespace-pre-line leading-relaxed bg-slate-950/40 p-3 rounded-xl border border-slate-800/60 font-sans">
                {art.content.trim()}
              </div>
            </div>

            {art.policy_tags && (
              <div className="pt-2 border-t border-slate-800/60 flex items-center space-x-1 text-[10px] text-slate-400">
                <Tag className="w-3 h-3 text-slate-500 mr-1" />
                <span>Tags:</span>
                <span className="text-slate-300 font-mono">{art.policy_tags}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
