interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function UnitNavigation({ activeTab, setActiveTab }: NavigationProps) {
  const tabs = [
    { id: 'discrepancy', label: 'Ketidaksesuaian Masuk', icon: '📋' },
    { id: 'report', label: 'Laporan Hasil', icon: '✅' },
  ];

  return (
    <div className="flex gap-4 mb-6">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`px-6 py-2.5 rounded text-sm font-semibold flex items-center gap-2.5 transition-all shadow-sm
            ${activeTab === tab.id 
              ? 'bg-[#5da0dd] text-white' 
              : 'bg-[#5da0dd]/10 text-[#3a75ad] hover:bg-[#5da0dd]/20'
            }`}
        >
          <span>{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </div>
  );
}