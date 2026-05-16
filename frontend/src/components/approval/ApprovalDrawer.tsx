import { useState } from 'react';
import { approvals as approvalApi } from '../../api';

interface ApprovalRequest {
  id: string;
  projectId: string;
  agentType: string;
  systemPrompt: string;
  userPrompt: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

interface ApprovalDrawerProps {
  requests: ApprovalRequest[];
  onUpdate: () => void;
}

const agentLabels: Record<string, string> = {
  planner: '策划代理',
  writer: '写作代理',
  editor: '编辑代理',
  character: '角色代理',
  chat: 'AI 聊天',
};

export default function ApprovalDrawer({ requests, onUpdate }: ApprovalDrawerProps) {
  const [processing, setProcessing] = useState<string | null>(null);

  const handleApprove = async (id: string) => {
    setProcessing(id);
    try {
      await approvalApi.approve(id);
      onUpdate();
    } catch (err) {
      console.error('批准失败:', err);
      alert('批准失败: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id: string) => {
    setProcessing(id);
    try {
      await approvalApi.reject(id);
      onUpdate();
    } catch (err) {
      console.error('拒绝失败:', err);
      alert('拒绝失败: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setProcessing(null);
    }
  };

  if (requests.length === 0) return null;

  const latestRequest = requests[0];

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200">
      <div className="px-4 py-3 bg-orange-50 border-b border-orange-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">⚠️</span>
          <span className="font-bold text-orange-800">LLM 调用审批</span>
        </div>
        <span className="text-xs text-orange-600 bg-orange-100 px-2 py-0.5 rounded">
          {requests.length} 个待审批
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div key={latestRequest.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700">
              {agentLabels[latestRequest.agentType] || latestRequest.agentType}
            </span>
            <span className="text-xs text-gray-400">
              {new Date(latestRequest.createdAt).toLocaleTimeString()}
            </span>
          </div>

          <div className="mb-4">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              System Prompt
            </label>
            <div className="mt-1 text-xs text-gray-700 bg-white rounded p-2 max-h-40 overflow-y-auto border border-gray-200">
              <pre className="whitespace-pre-wrap font-sans">{latestRequest.systemPrompt}</pre>
            </div>
          </div>

          <div className="mb-4">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              User Prompt
            </label>
            <div className="mt-1 text-xs text-gray-700 bg-white rounded p-2 max-h-40 overflow-y-auto border border-gray-200">
              <pre className="whitespace-pre-wrap font-sans">{latestRequest.userPrompt}</pre>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => handleApprove(latestRequest.id)}
              disabled={processing === latestRequest.id}
              className="flex-1 bg-green-500 text-white py-2 px-3 rounded text-sm font-medium hover:bg-green-600 disabled:opacity-50"
            >
              {processing === latestRequest.id ? '处理中...' : '✅ 批准'}
            </button>
            <button
              onClick={() => handleReject(latestRequest.id)}
              disabled={processing === latestRequest.id}
              className="flex-1 bg-red-500 text-white py-2 px-3 rounded text-sm font-medium hover:bg-red-600 disabled:opacity-50"
            >
              {processing === latestRequest.id ? '处理中...' : '❌ 拒绝'}
            </button>
          </div>
        </div>

        {requests.length > 1 && (
          <div className="text-center text-xs text-gray-400 py-2">
            还有 {requests.length - 1} 个待审批请求
          </div>
        )}
      </div>
    </div>
  );
}