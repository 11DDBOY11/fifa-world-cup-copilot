import React from 'react';

export type Language = 'en' | 'es';

interface LanguageToggleProps {
  language: Language;
  onChange: (lang: Language) => void;
}

const LANGUAGES: { value: Language; label: string }[] = [
  { value: 'en', label: '🇺🇸 English' },
  { value: 'es', label: '🇪🇸 Español' },
];

const LanguageToggle: React.FC<LanguageToggleProps> = ({ language, onChange }) => {
  return (
    <select
      id="language-toggle"
      value={language}
      onChange={(e) => onChange(e.target.value as Language)}
      className="bg-slate-700 text-white text-sm rounded-lg px-3 py-1.5 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
      aria-label="Select response language"
    >
      {LANGUAGES.map((lang) => (
        <option key={lang.value} value={lang.value}>
          {lang.label}
        </option>
      ))}
    </select>
  );
};

export default LanguageToggle;
