'use client';

import React, { useState, useMemo, useRef } from 'react';
import { useTrip } from '@/lib/trip-context';
import { Header } from '@/components/Header';
import { TripDocument, DocumentCategory } from '@/types';
import {
  FolderArchive,
  Plus,
  Search,
  FileText,
  MoreVertical,
  Pencil,
  Trash2,
  Download,
  Eye,
  Upload,
  X,
  Loader2,
  FileCheck,
} from 'lucide-react';

const CATEGORIES: ('All' | DocumentCategory)[] = [
  'All',
  'Stay',
  'Tickets',
  'Transport',
  'Activities',
  'Others',
];

export default function DocumentsPage() {
  const {
    state,
    openPdfViewer,
    uploadDocument,
    updateDocumentMetadata,
    deleteDocument,
  } = useTrip();

  const [selectedCategory, setSelectedCategory] = useState<'All' | DocumentCategory>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Upload modal state
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState<string>('');
  const [uploadCategory, setUploadCategory] = useState<DocumentCategory>('Stay');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Edit metadata modal state
  const [editingDoc, setEditingDoc] = useState<TripDocument | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editCategory, setEditCategory] = useState<DocumentCategory>('Stay');
  const [isEditing, setIsEditing] = useState<boolean>(false);

  // Delete confirm modal
  const [deletingDoc, setDeletingDoc] = useState<TripDocument | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const documents = state?.documents || [];

  // Filter documents
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      if (selectedCategory !== 'All' && doc.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          doc.title.toLowerCase().includes(q) ||
          doc.category.toLowerCase().includes(q) ||
          doc.uploadedBy.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [documents, selectedCategory, searchQuery]);

  // Handle file select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        setUploadError('Please select a valid PDF file');
        return;
      }
      setSelectedFile(file);
      if (!uploadTitle.trim()) {
        // Auto-fill title from clean filename
        const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        setUploadTitle(baseName);
      }
      setUploadError(null);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);

    if (!selectedFile) {
      setUploadError('Please select a PDF file to upload');
      return;
    }
    if (!uploadTitle.trim()) {
      setUploadError('Please provide a title for the document');
      return;
    }

    setIsUploading(true);
    const success = await uploadDocument(selectedFile, uploadTitle.trim(), uploadCategory);
    setIsUploading(false);

    if (success) {
      setIsUploadOpen(false);
      setSelectedFile(null);
      setUploadTitle('');
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoc || !editTitle.trim()) return;

    setIsEditing(true);
    await updateDocumentMetadata(editingDoc.id, editTitle.trim(), editCategory);
    setIsEditing(false);
    setEditingDoc(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingDoc) return;
    setIsDeleting(true);
    await deleteDocument(deletingDoc.id);
    setIsDeleting(false);
    setDeletingDoc(null);
  };

  function formatFileSize(bytes: number): string {
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${Math.round(bytes / 1024)} KB`;
  }

  function formatDocDate(dateStr: string): string {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }

  return (
    <div className="min-h-screen bg-bvc-bg pb-28">
      <Header
        title="Documents"
        showBack
        rightAction={
          <button
            type="button"
            onClick={() => setIsUploadOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-bvc-red text-white text-xs font-bold shadow-sm hover:bg-bvc-deepRed transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Upload</span>
          </button>
        }
      />

      <main className="max-w-lg mx-auto px-4 pt-3 space-y-4">
        {/* Category Filter Pills (Screen 5) */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 ${
                  isSelected
                    ? 'bg-bvc-red text-white shadow-sm'
                    : 'bg-white text-bvc-secondary border border-cream-300 hover:text-bvc-text hover:border-cream-400'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div className="relative rounded-2xl bg-white border border-cream-300 px-3.5 py-2.5 flex items-center focus-within:ring-2 focus-within:ring-bvc-red/20 focus-within:border-bvc-red shadow-sm transition-all">
          <Search className="w-4 h-4 text-bvc-muted mr-2.5 shrink-0" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-sm font-medium text-bvc-text placeholder:text-bvc-muted bg-transparent outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-xs text-bvc-secondary hover:text-bvc-text px-1"
            >
              Clear
            </button>
          )}
        </div>

        {/* Documents List */}
        {filteredDocuments.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 border border-cream-300 text-center shadow-card flex flex-col items-center justify-center my-4">
            <div className="w-12 h-12 rounded-2xl bg-cream-100 flex items-center justify-center text-bvc-muted mb-3">
              <FolderArchive className="w-6 h-6 stroke-[1.6]" />
            </div>
            <h3 className="text-sm font-bold text-bvc-text mb-1">
              {searchQuery ? 'No matching documents' : 'Your trip documents will appear here'}
            </h3>
            <p className="text-xs text-bvc-secondary max-w-xs mb-4">
              {searchQuery
                ? `No documents matching "${searchQuery}".`
                : 'Upload flight tickets, stay confirmations, and activity bookings to access them anytime.'}
            </p>
            <button
              type="button"
              onClick={() => setIsUploadOpen(true)}
              className="px-4 py-2 rounded-xl bg-bvc-red text-white text-xs font-bold shadow-sm hover:bg-bvc-deepRed transition-colors"
            >
              + Upload Booking PDF
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-4 border border-cream-300 shadow-card divide-y divide-cream-200">
            {filteredDocuments.map((doc) => {
              const isMenuOpen = activeMenuId === doc.id;

              return (
                <div
                  key={doc.id}
                  className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between relative group"
                >
                  {/* Left: Red PDF Icon & Title */}
                  <div
                    onClick={() => openPdfViewer(doc)}
                    className="flex items-center space-x-3 min-w-0 pr-2 cursor-pointer flex-1"
                  >
                    <div className="w-10 h-10 rounded-2xl bg-red-100 text-bvc-red flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-bvc-text truncate hover:text-bvc-red transition-colors leading-tight">
                        {doc.title}
                      </p>
                      <p className="text-[11px] text-bvc-secondary truncate mt-0.5">
                        {doc.category} · {formatFileSize(doc.fileSize)} · {formatDocDate(doc.createdAt)} · by{' '}
                        <span className="font-semibold text-bvc-text">{doc.uploadedBy}</span>
                      </p>
                    </div>
                  </div>

                  {/* Right: Three dots menu */}
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => setActiveMenuId(isMenuOpen ? null : doc.id)}
                      className="w-8 h-8 rounded-full hover:bg-cream-200 flex items-center justify-center text-bvc-secondary hover:text-bvc-text transition-colors"
                      aria-label="Actions"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {isMenuOpen && (
                      <div className="absolute right-0 top-8 z-20 w-36 bg-white rounded-2xl shadow-floating border border-cream-300 py-1.5 animate-in fade-in zoom-in-95 duration-150">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveMenuId(null);
                            openPdfViewer(doc);
                          }}
                          className="w-full px-3 py-1.5 text-xs text-bvc-text hover:bg-cream-100 flex items-center space-x-2 text-left"
                        >
                          <Eye className="w-3.5 h-3.5 text-bvc-secondary" />
                          <span>Open in App</span>
                        </button>
                        <a
                          href={doc.fileUrl.startsWith('http') ? doc.fileUrl : `/api/documents/file?id=${doc.id}`}
                          download={doc.fileName}
                          onClick={() => setActiveMenuId(null)}
                          className="w-full px-3 py-1.5 text-xs text-bvc-text hover:bg-cream-100 flex items-center space-x-2 text-left"
                        >
                          <Download className="w-3.5 h-3.5 text-bvc-secondary" />
                          <span>Download</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveMenuId(null);
                            setEditingDoc(doc);
                            setEditTitle(doc.title);
                            setEditCategory(doc.category);
                          }}
                          className="w-full px-3 py-1.5 text-xs text-bvc-text hover:bg-cream-100 flex items-center space-x-2 text-left"
                        >
                          <Pencil className="w-3.5 h-3.5 text-bvc-secondary" />
                          <span>Edit Details</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveMenuId(null);
                            setDeletingDoc(doc);
                          }}
                          className="w-full px-3 py-1.5 text-xs text-bvc-error hover:bg-red-50 flex items-center space-x-2 text-left font-medium"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-bvc-error" />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Upload Document Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-bvc-text/40 backdrop-blur-sm"
            onClick={() => setIsUploadOpen(false)}
          />

          <div className="relative w-full max-w-sm bg-cream-50 rounded-3xl p-6 shadow-floating border border-cream-300 z-10 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-bvc-peach/30 text-bvc-red flex items-center justify-center">
                  <Upload className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-bvc-text">Upload Booking PDF</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadOpen(false)}
                className="w-8 h-8 rounded-full bg-cream-200 flex items-center justify-center text-bvc-secondary hover:text-bvc-text"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {uploadError && (
              <div className="mb-4 p-2.5 bg-red-50 border border-red-200 text-bvc-error text-xs rounded-xl">
                {uploadError}
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              {/* File selector zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-cream-300 hover:border-bvc-red bg-white rounded-2xl p-4 text-center cursor-pointer transition-colors"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <FileText className="w-8 h-8 text-bvc-red mx-auto mb-2" />
                {selectedFile ? (
                  <div>
                    <p className="text-xs font-bold text-bvc-text truncate max-w-[200px] mx-auto">
                      {selectedFile.name}
                    </p>
                    <p className="text-[10px] text-bvc-secondary mt-0.5">
                      {(selectedFile.size / 1024).toFixed(0)} KB · Ready to upload
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-semibold text-bvc-text">Choose a PDF file</p>
                    <p className="text-[10px] text-bvc-muted mt-0.5">PDF up to 15 MB</p>
                  </div>
                )}
              </div>

              {/* Title input */}
              <div>
                <label className="block text-[11px] font-bold text-bvc-secondary uppercase tracking-wider mb-1">
                  Document Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Villa Booking Confirmation"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-cream-300 text-xs font-medium text-bvc-text focus:outline-none focus:ring-1 focus:ring-bvc-red"
                />
              </div>

              {/* Category picker */}
              <div>
                <label className="block text-[11px] font-bold text-bvc-secondary uppercase tracking-wider mb-1">
                  Category
                </label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value as DocumentCategory)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-cream-300 text-xs font-medium text-bvc-text focus:outline-none focus:ring-1 focus:ring-bvc-red"
                >
                  <option value="Stay">Stay</option>
                  <option value="Tickets">Tickets</option>
                  <option value="Transport">Transport</option>
                  <option value="Activities">Activities</option>
                  <option value="Others">Others</option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isUploading}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-bvc-deepRed to-bvc-red hover:from-bvc-red text-white text-xs font-bold shadow-redGlow active:scale-95 transition-all flex items-center justify-center space-x-2 disabled:opacity-70"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Uploading to Vercel Blob...</span>
                    </>
                  ) : (
                    <span>Upload Document</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Metadata Modal */}
      {editingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-bvc-text/40 backdrop-blur-sm"
            onClick={() => setEditingDoc(null)}
          />

          <div className="relative w-full max-w-sm bg-cream-50 rounded-3xl p-6 shadow-floating border border-cream-300 z-10 animate-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-bvc-text mb-4">Edit Document Details</h3>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-bvc-secondary uppercase tracking-wider mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-cream-300 text-xs font-medium text-bvc-text focus:outline-none focus:ring-1 focus:ring-bvc-red"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-bvc-secondary uppercase tracking-wider mb-1">
                  Category
                </label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value as DocumentCategory)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-cream-300 text-xs font-medium text-bvc-text focus:outline-none focus:ring-1 focus:ring-bvc-red"
                >
                  <option value="Stay">Stay</option>
                  <option value="Tickets">Tickets</option>
                  <option value="Transport">Transport</option>
                  <option value="Activities">Activities</option>
                  <option value="Others">Others</option>
                </select>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingDoc(null)}
                  className="flex-1 py-3 rounded-xl bg-cream-200 text-bvc-secondary text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditing}
                  className="flex-1 py-3 rounded-xl bg-bvc-red text-white text-xs font-bold shadow-sm"
                >
                  {isEditing ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Document Confirmation */}
      {deletingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-bvc-text/40 backdrop-blur-sm"
            onClick={() => setDeletingDoc(null)}
          />

          <div className="relative w-full max-w-sm bg-cream-50 rounded-3xl p-6 shadow-floating border border-cream-300 z-10 text-center animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-bvc-error flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-bvc-text mb-1">Delete Document?</h3>
            <p className="text-xs text-bvc-secondary mb-4 leading-relaxed">
              Are you sure you want to delete &ldquo;{deletingDoc.title}&rdquo;? This will remove the file from storage and record the deletion in history.
            </p>

            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setDeletingDoc(null)}
                className="flex-1 py-3 rounded-xl bg-cream-200 text-bvc-secondary text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="flex-1 py-3 rounded-xl bg-bvc-red text-white text-xs font-bold shadow-sm"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
