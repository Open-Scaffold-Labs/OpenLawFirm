import React from 'react';

/**
 * Form field with label, input, and optional error/hint text.
 *
 * @param {object} props
 * @param {string} props.label
 * @param {string} props.name
 * @param {string} [props.type] - 'text' | 'number' | 'date' | 'datetime-local' | 'email' | 'tel' | 'textarea' | 'select' | 'toggle'
 * @param {any} props.value
 * @param {(value: any) => void} props.onChange - called with the new value (already coerced for numbers/toggles)
 * @param {boolean} [props.required]
 * @param {string} [props.placeholder]
 * @param {string} [props.error]
 * @param {string} [props.hint]
 * @param {Array<{ value: any, label: string }>} [props.options] - for select
 * @param {string} [props.className]
 * @param {object} [props.inputProps] - additional input attributes (step, min, max, etc.)
 */
export default function FormField({
  label, name, type = 'text', value, onChange,
  required = false, placeholder, error, hint, options,
  className = '', inputProps = {},
}) {
  const baseInput =
    'w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition ' +
    (error
      ? 'border-red-300 focus:ring-red-200 focus:border-red-400'
      : 'border-gray-300 focus:ring-law-200 focus:border-law-400');

  let input;
  if (type === 'textarea') {
    input = (
      <textarea
        id={name} name={name} value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        required={required} placeholder={placeholder}
        rows={inputProps.rows || 3}
        className={baseInput}
      />
    );
  } else if (type === 'select') {
    input = (
      <select
        id={name} name={name} value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className={baseInput}
      >
        {!required && <option value="">— select —</option>}
        {(options || []).map((opt) => (
          <option key={String(opt.value)} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    );
  } else if (type === 'toggle') {
    input = (
      <label className="inline-flex items-center cursor-pointer">
        <input
          type="checkbox" checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-law-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-law-600" />
        <span className="ml-3 text-sm text-gray-600">{value ? 'On' : 'Off'}</span>
      </label>
    );
  } else if (type === 'number') {
    input = (
      <input
        type="number" id={name} name={name}
        value={value ?? ''}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === '' ? null : Number(v));
        }}
        required={required} placeholder={placeholder}
        {...inputProps}
        className={baseInput}
      />
    );
  } else {
    input = (
      <input
        type={type} id={name} name={name}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        required={required} placeholder={placeholder}
        {...inputProps}
        className={baseInput}
      />
    );
  }

  return (
    <div className={className}>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {input}
      {hint && !error && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
