import { useState } from 'react';
import type { MayaIntent } from '@ace-attorney/shared';
import { useMayaChatStore } from '@/stores/mayaChatStore';
import { useMayaChat } from '@/hooks/useMayaChat';
import { useMock } from '@/services/api';
import styles from './MayaChatPanel.module.css';

const shortcuts: { label: string; intent: MayaIntent }[] = [
  { label: '分析证物', intent: 'analyze_evidence' },
  { label: '梳理时间线', intent: 'reconstruct_timeline' },
  { label: '庭审提示', intent: 'trial_hint' },
  { label: '讨论证词', intent: 'discuss_testimony' },
];

export function MayaChatPanel() {
  const { isOpen, messages, isLoading } = useMayaChatStore();
  const { send, sessionId } = useMayaChat();
  const [input, setInput] = useState('');

  const handleSend = async (text: string, intent: MayaIntent = 'free_chat') => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setInput('');
    await send(trimmed, intent);
  };

  return (
    <aside className={`${styles.panel} ${!isOpen ? styles.panelClosed : ''}`}>
      <div className={styles.header}>
        真宵
        {!useMock && <span className={styles.modeBadge}>AI</span>}
      </div>
      <div className={styles.messages}>
        {!sessionId && (
          <div className={styles.msgMaya}>请先开始新游戏后再与真宵对话。</div>
        )}
        {sessionId && messages.length === 0 && (
          <div className={styles.msgMaya}>成步堂，有什么想和我讨论的吗？</div>
        )}
        {messages.map((msg) => {
          if (msg.role === 'maya' && msg.segments?.length) {
            return msg.segments.map((seg, i) => (
              <div key={`${msg.id}_s${i}`} className={styles.msgMaya}>
                {seg.text}
              </div>
            ));
          }
          return (
            <div
              key={msg.id}
              className={
                msg.role === 'user'
                  ? styles.msgUser
                  : msg.id.startsWith('err_')
                    ? styles.msgError
                    : styles.msgMaya
              }
            >
              {msg.content}
            </div>
          );
        })}
        {isLoading && <div className={styles.loading}>真宵思考中…</div>}
      </div>
      <div className={styles.shortcuts}>
        {shortcuts.map((s) => (
          <button
            key={s.intent}
            type="button"
            className={styles.shortcutBtn}
            onClick={() => handleSend(s.label, s.intent)}
            disabled={isLoading || !sessionId}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div className={styles.inputRow}>
        <input
          className={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
          placeholder={sessionId ? '输入消息…' : '请先开始游戏'}
          disabled={isLoading || !sessionId}
        />
        <button
          type="button"
          className={styles.sendBtn}
          onClick={() => handleSend(input)}
          disabled={isLoading || !input.trim() || !sessionId}
        >
          ➤
        </button>
      </div>
    </aside>
  );
}
