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
    <div className="border-b border-gray-300 mb-4 sm:mb-8 flex gap-1 sm:gap-6 md:gap-12 overflow-x-auto scrollbar-hide">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`flex items-center gap-1.5 pb-3 font-medium text-xs sm:text-sm transition-all duration-300 whitespace-nowrap shrink-0 px-1
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