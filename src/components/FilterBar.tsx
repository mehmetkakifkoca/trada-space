import React from 'react';

interface FilterBarProps {
  timeFilter: "ALL" | "TODAY" | "THIS_WEEK" | "THIS_MONTH" | "THIS_YEAR" | "CUSTOM";
  setTimeFilter: (value: "ALL" | "TODAY" | "THIS_WEEK" | "THIS_MONTH" | "THIS_YEAR" | "CUSTOM") => void;
  customStartDate: string;
  setCustomStartDate: (value: string) => void;
  customEndDate: string;
  setCustomEndDate: (value: string) => void;
  categoryFilter: string;
  setCategoryFilter: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  timeFilter,
  setTimeFilter,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate,
  categoryFilter,
  setCategoryFilter,
  statusFilter,
  setStatusFilter,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Zeit Filter */}
      <div className="flex flex-col gap-1">
        <label className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">
          Zeitraum
        </label>
        <select
          value={timeFilter}
          onChange={(e) => setTimeFilter(e.target.value as "ALL" | "TODAY" | "THIS_WEEK" | "THIS_MONTH" | "THIS_YEAR" | "CUSTOM")}
          className="bg-gray-50 border border-gray-100 text-xs font-bold rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-black cursor-pointer"
        >
          <option value="ALL">Gesamter Zeitraum</option>
          <option value="TODAY">Heute</option>
          <option value="THIS_WEEK">Diese Woche</option>
          <option value="THIS_MONTH">Dieser Monat</option>
          <option value="THIS_YEAR">Dieses Jahr</option>
          <option value="CUSTOM">Benutzerdefiniert</option>
        </select>
      </div>

      {/* Kategorie Filter */}
      <div className="flex flex-col gap-1">
        <label className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">
          Kategorie
        </label>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-gray-50 border border-gray-100 text-xs font-bold rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-black cursor-pointer"
        >
          <option value="ALL">Alle Kategorien</option>
          <option value="Grafik/Druck">Grafik/Druck</option>
          <option value="Web Design/SEO">Web Design/SEO</option>
          <option value="Online Marketing">Online Marketing</option>
          <option value="Foto/Video">Foto/Video</option>
          <option value="Medya Avusturya">Medya Avusturya</option>
        </select>
      </div>

      {/* Status Filter */}
      <div className="flex flex-col gap-1">
        <label className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">
          Status
        </label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-gray-50 border border-gray-100 text-xs font-bold rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-black cursor-pointer"
        >
          <option value="ALL">Alle Stati</option>
          <option value="OFFEN">Offen</option>
          <option value="BEZAHLT">Bezahlt (Alle)</option>
          <option value="ENTWURF">Entwurf</option>
          <option value="OVERDUE">Überfällig</option>
          <option value="BAR">Bar</option>
          <option value="BANK">Bank</option>
        </select>
      </div>

      {/* Custom Date Range Picker */}
      {timeFilter === "CUSTOM" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 p-6 rounded-3xl animate-in slide-in-from-top-2 duration-200">
          <div className="space-y-1">
            <label className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">
              Startdatum
            </label>
            <input
              type="date"
              className="w-full bg-white border border-gray-100 text-xs font-bold rounded-xl px-3 py-2.5 outline-none"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">
              Enddatum
            </label>
            <input
              type="date"
              className="w-full bg-white border border-gray-100 text-xs font-bold rounded-xl px-3 py-2.5 outline-none"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
