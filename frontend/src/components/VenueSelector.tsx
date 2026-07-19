import React from 'react';

export interface VenueOption {
  id: string;
  name: string;
  city: string;
  country: string;
}

interface VenueSelectorProps {
  venues: VenueOption[];
  selectedId: string | null;
  onChange: (venueId: string) => void;
  disabled?: boolean;
}

const VenueSelector: React.FC<VenueSelectorProps> = ({ venues, selectedId, onChange, disabled }) => {
  return (
    <select
      id="venue-selector"
      value={selectedId ?? ''}
      onChange={(e) => {
        if (e.target.value) onChange(e.target.value);
      }}
      disabled={disabled}
      className="bg-slate-700 text-white text-sm rounded-lg px-3 py-1.5 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed max-w-[180px] truncate"
      aria-label="Select venue"
    >
      <option value="" disabled>
        📍 Select venue…
      </option>
      {venues.map((v) => (
        <option key={v.id} value={v.id}>
          {v.name}
        </option>
      ))}
    </select>
  );
};

export default VenueSelector;
