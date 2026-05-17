import { useNavigate } from 'react-router-dom';
import AIAssistant from '../components/chat/AIAssistant';

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="h-screen bg-gray-50 overflow-hidden">
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <span className="text-2xl sm:text-3xl shrink-0">✍️</span>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-gray-800 truncate">NovelFlow</h1>
              <p className="text-[11px] sm:text-xs text-gray-500 hidden sm:block">多智能体 AI 写作平台</p>
            </div>
          </div>
        </div>
      </header>
      <div className="h-[calc(100vh-60px)]">
        <AIAssistant
          projectId={null}
          onProjectCreated={(id) => navigate(`/project/${id}`)}
        />
      </div>
    </div>
  );
}