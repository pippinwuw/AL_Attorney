import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { GameLayout } from '@/app/GameLayout';
import { DialogBox } from '@/components/vn/DialogBox';
import { SceneTabs } from '@/components/investigation/SceneTabs';
import { SceneView } from '@/components/investigation/SceneView';
import { EvidenceCourtRecord } from '@/components/investigation/EvidenceCourtRecord';
import { EvidenceDetailModal } from '@/components/investigation/EvidenceDetailModal';
import { MayaControlsPlaceholder } from '@/components/maya/MayaControlsPlaceholder';
import { useGameStore } from '@/stores/gameStore';
import { useRoleStore } from '@/stores/roleStore';
import { useEvidenceStore } from '@/stores/evidenceStore';
import { useTrialStore } from '@/stores/trialStore';
import { useMayaChatStore } from '@/stores/mayaChatStore';
import { useMayaChat } from '@/hooks/useMayaChat';
import { api } from '@/services/api';
import { case01 } from '@/data/mock/caseData';
import type { Hotspot, EvidenceItem, DialogLine } from '@ace-attorney/shared';
import styles from './InvestigationPage.module.css';

export function InvestigationPage() {
  const navigate = useNavigate();
  const sessionId = useGameStore((s) => s.sessionId);
  const currentSceneId = useGameStore((s) => s.currentSceneId);
  const setCurrentSceneId = useGameStore((s) => s.setCurrentSceneId);
  const isNaruhodo = useRoleStore((s) => s.playerRole === 'naruhodo');
  const collected = useEvidenceStore((s) => s.collected);
  const addEvidence = useEvidenceStore((s) => s.addEvidence);
  const examinedHotspots = useTrialStore((s) => s.examinedHotspots);
  const addExaminedHotspot = useTrialStore((s) => s.addExaminedHotspot);
  const setMayaOpen = useMayaChatStore((s) => s.setOpen);
  const { send } = useMayaChat();

  const [dialog, setDialog] = useState<DialogLine | null>(null);
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceItem | null>(null);
  const [modalEvidence, setModalEvidence] = useState<EvidenceItem | null>(null);

  const scene = case01.investigation.scenes.find((s) => s.id === currentSceneId)!;
  const required = case01.investigation.requiredEvidence;
  const canProceed = required.every((id) => collected.some((e) => e.id === id));

  const handleHotspot = async (hotspot: Hotspot) => {
    if (!isNaruhodo || !sessionId) return;
    if (hotspot.once && examinedHotspots.includes(hotspot.id)) return;

    const res = await api.examineHotspot({ sessionId, hotspotId: hotspot.id });
    addExaminedHotspot(hotspot.id);
    if (res.evidence) addEvidence(res.evidence);
    if (res.dialog[0]) setDialog(res.dialog[0]);
  };

  const goToTrial = async () => {
    if (!sessionId) return;
    await api.transition({ sessionId, toPhase: 'trial' });
    useGameStore.getState().setPhase('trial');
    navigate('/trial');
  };

  return (
    <>
      <GameLayout
        phase="investigation"
        sceneName={scene.name}
        main={
          <div className={styles.content}>
            <SceneTabs
              scenes={case01.investigation.scenes}
              currentId={currentSceneId}
              disabled={!isNaruhodo}
              onChange={setCurrentSceneId}
            />
            <div className={styles.mainRow}>
              <SceneView
                scene={scene}
                hotspots={case01.investigation.hotspots}
                examinedIds={examinedHotspots}
                disabled={!isNaruhodo}
                onHotspotClick={handleHotspot}
              />
              <EvidenceCourtRecord
                collected={collected}
                totalCount={required.length}
                selectedId={selectedEvidence?.id}
                onSelect={(item) => {
                  setSelectedEvidence(item);
                  setModalEvidence(item);
                }}
                onDiscuss={() => {
                  if (!selectedEvidence) return;
                  setMayaOpen(true);
                  void send(
                    `请帮我分析证物「${selectedEvidence.name}」`,
                    'analyze_evidence',
                    { evidenceId: selectedEvidence.id },
                  );
                }}
              />
            </div>
            <div className={styles.proceedBar}>
              <button
                type="button"
                className={`${styles.proceedBtn} ${canProceed ? styles.proceedBtnReady : ''}`}
                disabled={!canProceed}
                onClick={goToTrial}
              >
                准备开庭
              </button>
            </div>
          </div>
        }
        bottom={
          <>
            {!isNaruhodo && <MayaControlsPlaceholder />}
            {dialog && (
              <DialogBox
                speaker={dialog.speaker}
                text={dialog.text}
                onAdvance={() => setDialog(null)}
              />
            )}
          </>
        }
      />
      <AnimatePresence>
        {modalEvidence && (
          <EvidenceDetailModal item={modalEvidence} onClose={() => setModalEvidence(null)} />
        )}
      </AnimatePresence>
    </>
  );
}
