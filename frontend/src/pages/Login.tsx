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
    <div className="min-h-[100dvh] bg-gradient-to-br from-orange-50 via-red-50 to-rose-100 flex items-center justify-center px-4 py-6 sm:p-4">
      <div className="w-full max-w-sm sm:max-w-md">
        <div className="text-center mb-6 sm:mb-8">
          <div className="text-5xl sm:text-6xl mb-3 sm:mb-4">🦞</div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">NovelFlow</h1>
          <p className="text-sm sm:text-base text-gray-500 mt-1.5 sm:mt-2">番茄小说 AI 写作平台 · 多智能体协作</p>
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
