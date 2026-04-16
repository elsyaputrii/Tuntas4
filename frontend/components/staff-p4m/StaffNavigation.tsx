interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function StaffNavigation({ activeTab, setActiveTab }: NavigationProps) {
  const tabs = [
    { id: 'incoming', label: 'Laporan Masuk', icon: '📩' },
    { id: 'process', label: 'Proses & Pantau', icon: '🔄' },
    { id: 'recap', label: 'Rekapitulasi', icon: '📊' },
  ];

  return (
    <div className="border-b border-gray-300 mb-8 flex gap-12">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`flex items-center gap-2 pb-3 font-medium text-sm transition-all duration-300 
            ${activeTab === tab.id 
              ? 'text-black border-b-2 border-black font-semibold' 
              : 'text-gray-500 border-b-2 border-transparent hover:text-black'
            }`}
        >
          <span>{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </div>
  );
}