import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { EvidenceItem } from '@ace-attorney/shared';
import { useCourtRecordStore } from '@/stores/courtRecordStore';
import { useEvidenceStore } from '@/stores/evidenceStore';
import { useGameStore } from '@/stores/gameStore';
import { useDossierChat } from '@/hooks/useDossierChat';
import { EvidenceCourtRecord } from '@/components/investigation/EvidenceCourtRecord';
import { EvidenceDetailModal } from '@/components/investigation/EvidenceDetailModal';
import { getAllEvidenceItems } from '@/data/mock/caseData';
import { api } from '@/services/api';
import styles from './CourtRecordPanel.module.css';

export function CourtRecordPanel() {
  const isOpen = useCourtRecordStore((s) => s.isOpen);
  const activeTab = useCourtRecordStore((s) => s.activeTab);
  const dossier = useCourtRecordStore((s) => s.dossier);
  const dossierMessages = useCourtRecordStore((s) => s.dossierMessages);
  const isLoading = useCourtRecordStore((s) => s.isLoading);
  const setOpen = useCourtRecordStore((s) => s.setOpen);
  const setActiveTab = useCourtRecordStore((s) => s.setActiveTab);
  const setDossier = useCourtRecordStore((s) => s.setDossier);
  const setDossierMessages = useCourtRecordStore((s) => s.setDossierMessages);

  const sessionId = useGameStore((s) => s.sessionId);
  const collected = useEvidenceStore((s) => s.collected);
  const { send } = useDossierChat();

  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceItem | null>(null);
  const [modalEvidence, setModalEvidence] = useState<EvidenceItem | null>(null);
  const [input, setInput] = useState('');

  const totalEvidence = getAllEvidenceItems().length;

  useEffect(() => {
    if (!isOpen || !sessionId) return;

    let cancelled = false;
    (async () => {
      try {
        const state = await api.getDossierState(sessionId);
        if (cancelled) return;
        setDossier(state.dossier);
        setDossierMessages(state.dossierChatHistory);
      } catch (err) {
        console.error('[CourtRecord] failed to load dossier:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, sessionId, setDossier, setDossierMessages]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setInput('');
    await send(trimmed);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setOpen(false)}
        >
          <motion.aside
            className={styles.panel}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.25 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.header}>
              <span className={styles.title}>法庭记录</span>
              <button type="button" className={styles.closeBtn} onClick={() => setOpen(false)}>
                关闭
              </button>
            </div>

            <div className={styles.tabs}>
              <button
                type="button"
                className={`${styles.tab} ${activeTab === 'evidence' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('evidence')}
              >
                证物
              </button>
              <button
                type="button"
                className={`${styles.tab} ${activeTab === 'dossier' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('dossier')}
              >
                案情梳理
              </button>
            </div>

            <div className={styles.body}>
              {activeTab === 'evidence' && (
                <div className={styles.evidenceBody}>
                  <EvidenceCourtRecord
                    collected={collected}
                    totalCount={totalEvidence}
                    selectedId={selectedEvidence?.id}
                    onSelect={(item) => {
                      setSelectedEvidence(item);
                      setModalEvidence(item);
                    }}
                  />
                </div>
              )}

              {activeTab === 'dossier' && (
                <div className={styles.dossierBody}>
                  <div className={styles.chatPane}>
                    <div className={styles.chatHeader}>与真宵对话 — 指导整理卷宗</div>
                    <div className={styles.chatMessages}>
                      {!sessionId && (
                        <div className={styles.msgMaya}>请先开始新游戏后再整理案情。</div>
                      )}
                      {sessionId && dossierMessages.length === 0 && (
                        <div className={styles.msgMaya}>
                          成步堂，告诉我该把哪些信息写进卷宗吧！
                        </div>
                      )}
                      {dossierMessages.map((msg) => {
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
                            className={msg.role === 'user' ? styles.msgUser : styles.msgMaya}
                          >
                            {msg.content}
                          </div>
                        );
                      })}
                      {isLoading && <div className={styles.loading}>真宵整理中…</div>}
                    </div>
                    <div className={styles.chatInputRow}>
                      <input
                        className={styles.chatInput}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder={
                          sessionId ? '例如：把电梯停在三楼写进时间线…' : '请先开始游戏'
                        }
                        disabled={isLoading || !sessionId}
                      />
                      <button
                        type="button"
                        className={styles.sendBtn}
                        onClick={handleSend}
                        disabled={isLoading || !input.trim() || !sessionId}
                      >
                        ➤
                      </button>
                    </div>
                  </div>

                  <div className={styles.dossierPane}>
                    <div className={styles.dossierHeader}>卷宗（真宵整理）</div>
                    <div className={styles.dossierScroll}>
                      {dossier ? (
                        <>
                          <div className={styles.dossierTitle}>{dossier.title}</div>
                          {dossier.sections.map((section) => (
                            <div key={section.id} className={styles.section}>
                              <div className={styles.sectionHeading}>{section.heading}</div>
                              <div className={styles.sectionBody}>{section.body}</div>
                            </div>
                          ))}
                        </>
                      ) : (
                        <div className={styles.emptyHint}>卷宗加载中…</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.aside>

          <AnimatePresence>
            {modalEvidence && (
              <EvidenceDetailModal item={modalEvidence} onClose={() => setModalEvidence(null)} />
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
