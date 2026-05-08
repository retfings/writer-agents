interface Props {
  activeTab: 'outline' | 'ai' | 'none';
  onTabChange: (tab: 'outline' | 'ai' | 'none') => void;
}

export default function MobileBottomNav({ activeTab, onTabChange }: Props) {
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 pb-safe">
      <div className="flex items-center justify-around h-12">
        <button
          onClick={() => onTabChange(activeTab === 'outline' ? 'none' : 'outline')}
          className={`flex flex-col items-center justify-center w-full h-full transition ${
            activeTab === 'outline' ? 'text-orange-500' : 'text-gray-400'
          }`}
        >
          <span className="text-lg">📑</span>
          <span className="text-[9px] mt-0.5">大纲</span>
        </button>
        <button
          onClick={() => onTabChange(activeTab === 'ai' ? 'none' : 'ai')}
          className={`flex flex-col items-center justify-center w-full h-full transition ${
            activeTab === 'ai' ? 'text-orange-500' : 'text-gray-400'
          }`}
        >
          <span className="text-lg">🤖</span>
          <span className="text-[9px] mt-0.5">AI</span>
        </button>
      </div>
    </div>
  );
}
