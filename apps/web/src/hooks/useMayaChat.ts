import { useCallback } from 'react';
import type { MayaIntent } from '@ace-attorney/shared';
import { useMayaChatStore } from '@/stores/mayaChatStore';
import { useGameStore } from '@/stores/gameStore';
import { api, useMock } from '@/services/api';

export function useMayaChat() {
  const sessionId = useGameStore((s) => s.sessionId);
  const { addMessage, setLoading, isLoading } = useMayaChatStore();

  const send = useCallback(
    async (
      text: string,
      intent: MayaIntent = 'free_chat',
      payload?: { evidenceId?: string; testimonyLineId?: string },
    ): Promise<string | null> => {
      if (!text.trim() || !sessionId) return null;

      addMessage({
        id: `u_${Date.now()}`,
        role: 'user',
        content: text,
        timestamp: Date.now(),
      });
      setLoading(true);

      try {
        const res = await api.mayaChat({
          sessionId,
          intent,
          userMessage: text,
          payload,
        });
      addMessage({
        id: `m_${Date.now()}`,
        role: 'maya',
        content: res.reply,
        segments: res.segments,
        timestamp: Date.now(),
      });
        return res.reply;
      } catch (err) {
        const detail = err instanceof Error ? err.message : '未知错误';
        const hint = useMock
          ? '当前为 Mock 模式，不应出现网络错误'
          : '请确认已运行 pnpm dev:server，且根目录 .env 中 VITE_USE_MOCK=false、DEEPSEEK_API_KEY 已填写';
        addMessage({
          id: `err_${Date.now()}`,
          role: 'maya',
          content: `（真宵暂时无法回应：${detail}。${hint}）`,
          timestamp: Date.now(),
        });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [sessionId, addMessage, setLoading],
  );

  return { send, isLoading, sessionId };
}
