"use client";
import { useState, useRef, useEffect } from "react";
import { ChevronDown, Search, X } from "lucide-react";

const daftarUnit = [
  "MANAJEMEN", "P4M", "P3M", "SPI", "UPA-PERPUS", "UPA-PKK", "UPA-PP", 
  "UPA-TIK", "SHILAU", "SBAK", "SBUM", "Pokja BMN dan Pengadaan", 
  "Pokja Humas dan Kerjasama", "Pokja Kemahasiswaan", "Pokja Keuangan", 
  "Pokja Organisasi SDM", "Pokja Perencanaan"
];

export default function UnitSearchSelect() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  // Berubah menjadi array untuk menampung banyak pilihan
  const [selectedUnits, setSelectedUnits] = useState<string[]>([]); 
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

  const toggleUnit = (unit: string) => {
    if (selectedUnits.includes(unit)) {
      setSelectedUnits(selectedUnits.filter((item) => item !== unit));
    } else {
      setSelectedUnits([...selectedUnits, unit]);
    }
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Box Pilihan (Menampilkan unit-unit yang dipilih) */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="border border-black p-2 flex justify-between items-center cursor-pointer bg-white min-h-[35px]"
      >
        <div className="flex flex-wrap gap-1">
          {selectedUnits.length > 0 ? (
            selectedUnits.map((unit) => (
              <span key={unit} className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-sm text-[9px] font-bold flex items-center gap-1">
                {unit}
                <X size={10} className="cursor-pointer" onClick={(e) => {
                  e.stopPropagation();
                  toggleUnit(unit);
                }}/>
              </span>
            ))
          ) : (
            <span className="text-gray-400 text-[11px]">pilih unit yang di tuju</span>
          )}
        </div>
        <ChevronDown size={14} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </div>

      {/* Dropdown Content */}
      {isOpen && (
        <div className="absolute z-20 w-full mt-1 border border-black bg-white shadow-xl animate-in fade-in zoom-in-95 duration-100">
          {/* Input Pencarian */}
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

          {/* List Unit dengan Checkbox */}
          <div className="max-h-52 overflow-y-auto">
            {filteredUnits.length > 0 ? (
              filteredUnits.map((unit, index) => (
                <div
                  key={index}
                  className={`px-3 py-2 text-[11px] flex items-center gap-3 cursor-pointer border-b border-gray-100 last:border-none uppercase transition-colors ${
                    selectedUnits.includes(unit) ? "bg-blue-50 font-bold" : "hover:bg-gray-100"
                  }`}
                  onClick={() => toggleUnit(unit)}
                >
                  <input 
                    type="checkbox" 
                    checked={selectedUnits.includes(unit)} 
                    readOnly 
                    className="w-3 h-3 accent-[#5da0dd] pointer-events-none"
                  />
                  <span className={selectedUnits.includes(unit) ? "text-[#5da0dd]" : "text-gray-700"}>
                    {unit}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-3 text-[10px] text-red-500 italic text-center">Unit tidak ditemukan</div>
            )}
          </div>

          {/* Footer Dropdown untuk ringkasan cepat */}
          {selectedUnits.length > 0 && (
            <div className="p-2 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
               <span className="text-[9px] font-bold text-gray-500 uppercase">{selectedUnits.length} Unit Terpilih</span>
               <button 
                onClick={() => setSelectedUnits([])}
                className="text-[9px] text-red-500 font-bold hover:underline"
               >
                 Hapus Semua
               </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}