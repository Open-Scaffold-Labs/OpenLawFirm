import React, { useState, useEffect } from 'react';
import { apiFetch } from '../auth';
import Modal from './Modal';
import FormField from './FormField';

const CATEGORY_OPTIONS = [
  { value: 'pleading', label: 'Pleading / Court filing' },
  { value: 'correspondence', label: 'Correspondence' },
  { value: 'contract', label: 'Contract / Agreement' },
  { value: 'medical_record', label: 'Medical record' },
  { value: 'evidence', label: 'Evidence' },
  { value: 'discovery', label: 'Discovery' },
  { value: 'research', label: 'Research / memorandum' },
  { value: 'invoice', label: 'Invoice / Receipt' },
  { value: 'general', label: 'General' },
];

/**
 * Document metadata form. File-byte storage is deferred to the
 * DocumentStore adapter wiring (Box/iManage/NetDocuments); for v0.1 this
 * captures metadata only — filename, type, size, category, description.
 * Useful for the demo and for matter-level document inventory.
 */
export default function DocumentFormModal({ open, onClose, onSaved, matterId }) {
  const [form, setForm] = useState(initialFormState());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function initialFormState() {
    return {
      file_name: '',
      file_type: 'pdf',
      file_size: '',
      doc_category: 'general',
      description: '',
    };
  }

  useEffect(() => {
    if (open) { setForm(initialFormState()); setError(null); }
  }, [open]);

  function set(field, value) { setForm((f) => ({ ...f, [field]: value })); }

  function handleFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setForm((prev) => ({
      ...prev,
      file_name: f.name,
      file_size: f.size,
      file_type: f.name.split('.').pop()?.toLowerCase() || prev.file_type,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true); setError(null);
    try {
      const body = {
        file_name: form.file_name,
        file_type: form.file_type,
        file_size: form.file_size ? Number(form.file_size) : null,
        doc_category: form.doc_category,
        description: form.description,
      };
      const res = await apiFetch(`/api/matters/${matterId}/documents`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error || `HTTP ${res.status}`);
      onSaved?.(await res.json());
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open} onClose={onClose}
      title="Add document"
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button>
          <button type="submit" form="document-form" disabled={saving}
            className="px-4 py-2 text-sm bg-law-600 text-white rounded-lg hover:bg-law-700 disabled:opacity-60">
            {saving ? 'Saving…' : 'Add document'}
          </button>
        </div>
      }
    >
      <form id="document-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg px-3 py-2">{error}</div>
        )}
        <div className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-3 py-2">
          <strong>Metadata-only.</strong> v0.1 records the document filename and category.
          Physical file storage will route through the configured DocumentStore
          adapter (Box, iManage, NetDocuments) — see Settings → Integrations.
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Select file to capture name + size</label>
          <input type="file" onChange={handleFile}
            className="block w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-law-50 file:text-law-700 hover:file:bg-law-100" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Filename" name="file_name" required
            value={form.file_name} onChange={(v) => set('file_name', v)} />
          <FormField label="Type" name="file_type"
            value={form.file_type} onChange={(v) => set('file_type', v)}
            placeholder="pdf / docx / xlsx" />
        </div>
        <FormField label="Category" name="doc_category" type="select"
          value={form.doc_category} onChange={(v) => set('doc_category', v)}
          options={CATEGORY_OPTIONS} />
        <FormField label="Description" name="description" type="textarea"
          value={form.description} onChange={(v) => set('description', v)} />
      </form>
    </Modal>
  );
}
