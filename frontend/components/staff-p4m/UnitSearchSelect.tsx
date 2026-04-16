"use client";
import { useState, useRef, useEffect } from "react";
import { ChevronDown, Search } from "lucide-react";

const daftarUnit = [
  "MANAJEMEN", "P4M", "P3M", "SPI", "UPA-PERPUS", "UPA-PKK", "UPA-PP", 
  "UPA-TIK", "SHILAU", "SBAK", "SBUM", "Pokja BMN dan Pengadaan", 
  "Pokja Humas dan Kerjasama", "Pokja Kemahasiswaan", "Pokja Keuangan", 
  "Pokja Organisasi SDM", "Pokja Perencanaan"
];

export default function UnitSearchSelect() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredUnits = daftarUnit.filter((unit) =>
    unit.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Box Pilihan */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="border border-black p-2 flex justify-between items-center cursor-pointer bg-white text-[11px] h-[35px]"
      >
        <span className={selectedUnit ? "text-black" : "text-gray-400"}>
          {selectedUnit || "pilih unit yang di tuju"}
        </span>
        <ChevronDown size={14} />
      </div>

      {/* Dropdown Content */}
      {isOpen && (
        <div className="absolute z-20 w-full mt-1 border border-black bg-white shadow-xl">
          {/* Input Pencarian di dalam Dropdown */}
          <div className="p-2 border-b border-gray-200 bg-gray-50">
            <div className="relative flex items-center">
              <input
                type="text"
                placeholder="Cari unit..."
                className="w-full border border-gray-300 px-2 py-1 text-[11px] outline-none focus:border-blue-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
              <Search className="absolute right-2 text-gray-400" size={12} />
            </div>
          </div>

          {/* List Unit */}
          <div className="max-h-52 overflow-y-auto">
            {filteredUnits.length > 0 ? (
              filteredUnits.map((unit, index) => (
                <div
                  key={index}
                  className="px-3 py-2 text-[11px] hover:bg-[#5da0dd] hover:text-white cursor-pointer border-b border-gray-100 last:border-none uppercase"
                  onClick={() => {
                    setSelectedUnit(unit);
                    setIsOpen(false);
                    setSearchTerm("");
                  }}
                >
                  {unit}
                </div>
              ))
            ) : (
              <div className="p-3 text-[10px] text-red-500 italic text-center">Unit tidak ditemukan</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}