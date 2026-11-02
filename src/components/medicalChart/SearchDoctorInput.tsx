"use client";

import { Search, X } from "lucide-react";
import React from "react";

interface SearchDoctorInputProps {
  searchDoctorInput: string;
  setSearchDoctorInput: (value: string) => void;
  handleApplySearchDoctor: () => void;
}

export default function SearchDoctorInput({
  searchDoctorInput,
  setSearchDoctorInput,
  handleApplySearchDoctor,
}: SearchDoctorInputProps) {
  return (
    <div className="relative min-w-[200px] flex-1">
      <Search className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        placeholder="ค้นหาชื่อแพทย์..."
        value={searchDoctorInput}
        onChange={(e) => setSearchDoctorInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleApplySearchDoctor();
        }}
        className="h-[56px] w-full rounded-2xl border border-slate-200 bg-slate-50 pr-12 pl-12 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
      />
      {searchDoctorInput && (
        <button
          type="button"
          onClick={() => setSearchDoctorInput("")}
          className="absolute top-1/2 right-3 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
