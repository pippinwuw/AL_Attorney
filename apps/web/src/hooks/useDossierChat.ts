import { useCallback } from 'react';
import { useCourtRecordStore } from '@/stores/courtRecordStore';
import { useGameStore } from '@/stores/gameStore';
import { api, useMock } from '@/services/api';

export function useDossierChat() {
  const sessionId = useGameStore((s) => s.sessionId);
  const { addDossierMessage, setDossier, setLoading, isLoading } = useCourtRecordStore();

  const send = useCallback(
    async (text: string): Promise<string | null> => {
      if (!text.trim() || !sessionId) return null;

      addDossierMessage({
        id: `u_${Date.now()}`,
        role: 'user',
        content: text,
        timestamp: Date.now(),
      });
      setLoading(true);

      try {
        const res = await api.mayaChat({
          sessionId,
          intent: 'edit_dossier',
          userMessage: text,
        });

        addDossierMessage({
          id: `m_${Date.now()}`,
          role: 'maya',
          content: res.reply,
          segments: res.segments,
          timestamp: Date.now(),
        });

        if (res.dossier) {
          setDossier(res.dossier);
        }

        return res.reply;
      } catch (err) {
        const detail = err instanceof Error ? err.message : '未知错误';
        const hint = useMock
          ? '当前为 Mock 模式，不应出现网络错误'
          : '请确认已运行 pnpm dev:server';
        addDossierMessage({
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
    [sessionId, addDossierMessage, setDossier, setLoading],
  );

  return { send, isLoading, sessionId };
}
