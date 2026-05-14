import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function Login() {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegister) {
        await register(username, password, displayName || username);
      } else {
        await login(username, password);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full bg-gradient-to-br from-orange-50 via-red-50 to-rose-100 flex items-center justify-center px-4 py-6 sm:p-4 overflow-auto">
      <div className="w-full max-w-sm sm:max-w-md">
        <div className="text-center mb-6 sm:mb-8">
          <div className="text-5xl sm:text-6xl mb-3 sm:mb-4">✍️</div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">NovelFlow</h1>
          <p className="text-sm sm:text-base text-gray-500 mt-1.5 sm:mt-2">番茄小说 AI 写作平台 · 多智能体协作</p>
        </div>
        <div className="text-center mb-4">
          <a href="https://github.com/retfings/writer-agents" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-gray-400 hover:text-orange-500 transition text-sm">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
            </svg>
            <span>GitHub</span>
          </a>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-5 sm:p-8">
          <div className="flex mb-5 sm:mb-6 bg-gray-100 rounded-lg p-1">
            <button
              type="button"
              className={`flex-1 py-2.5 sm:py-2 rounded-md text-sm sm:text-sm font-medium transition min-h-[40px] ${
                !isRegister ? 'bg-white shadow text-gray-800' : 'text-gray-500'
              }`}
              onClick={() => setIsRegister(false)}
            >
              登录
            </button>
            <button
              type="button"
              className={`flex-1 py-2.5 sm:py-2 rounded-md text-sm sm:text-sm font-medium transition min-h-[40px] ${
                isRegister ? 'bg-white shadow text-gray-800' : 'text-gray-500'
              }`}
              onClick={() => setIsRegister(true)}
            >
              注册
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full px-4 py-3 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none text-base sm:text-sm"
                required
                autoComplete="username"
                placeholder="输入用户名"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none text-base sm:text-sm"
                required
                minLength={6}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                placeholder="至少6位"
              />
            </div>
            {isRegister && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">显示名称</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  className="w-full px-4 py-3 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none text-base sm:text-sm"
                  placeholder="可选，默认用用户名"
                />
              </div>
            )}
            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-3 sm:py-2 rounded-lg text-sm">{error}</div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 text-white py-3 sm:py-2.5 rounded-lg font-medium hover:bg-orange-600 transition disabled:opacity-50 min-h-[48px] sm:min-h-[44px] text-base sm:text-sm"
            >
              {loading ? '请稍候...' : isRegister ? '注册' : '登录'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
