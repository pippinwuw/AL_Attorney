import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import type { TrialStateResponse } from '@ace-attorney/shared';
import type { PortraitSlot } from '@/components/vn/CharacterPortrait';
import { GameLayout } from '@/app/GameLayout';
import { DialogBox } from '@/components/vn/DialogBox';
import { CourtLayout } from '@/components/trial/CourtLayout';
import { TestimonyBox } from '@/components/trial/TestimonyBox';
import { ObjectionPanel } from '@/components/trial/ObjectionPanel';
import { ReconstructionPanel } from '@/components/trial/ReconstructionPanel';
import { ObjectionOverlay } from '@/components/trial/ObjectionOverlay';
import { MayaHintBanner } from '@/components/maya/MayaHintBanner';
import { MayaControlsPlaceholder } from '@/components/maya/MayaControlsPlaceholder';
import { useGameStore } from '@/stores/gameStore';
import { useRoleStore } from '@/stores/roleStore';
import { useEvidenceStore } from '@/stores/evidenceStore';
import { api } from '@/services/api';
import styles from './TrialPage.module.css';
import dialogStyles from '@/components/vn/DialogBox.module.css';

interface CourtDisplay {
  portrait?: string;
  slot: PortraitSlot;
  showWitnessTag: boolean;
}

function getCourtDisplay(state: TrialStateResponse): CourtDisplay {
  const { phase } = state;

  if (phase === 'testimony') {
    return { portrait: 'witness', slot: 'center', showWitnessTag: true };
  }

  if (phase === 'flow2_reconstruction' || phase === 'flow2_explanation') {
    return { portrait: 'naruhodo', slot: 'left', showWitnessTag: false };
  }

  const portrait = state.lastMessage?.portrait ?? state.scriptLine?.portrait;
  if (!portrait) {
    return { portrait: undefined, slot: 'center', showWitnessTag: false };
  }

  const slot: PortraitSlot =
    portrait === 'naruhodo' || portrait === 'maya'
      ? 'left'
      : portrait === 'witness'
        ? 'center'
        : 'right';

  return { portrait, slot, showWitnessTag: portrait === 'witness' };
}

export function TrialPage() {
  const navigate = useNavigate();
  const sessionId = useGameStore((s) => s.sessionId);
  const setHp = useGameStore((s) => s.setHp);
  const damageHp = useGameStore((s) => s.damageHp);
  const isNaruhodo = useRoleStore((s) => s.playerRole === 'naruhodo');
  const collected = useEvidenceStore((s) => s.collected);

  const [trialState, setTrialState] = useState<TrialStateResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [showObjection, setShowObjection] = useState(false);
  const [selectedLineIndex, setSelectedLineIndex] = useState(0);
  const [showObjectionPanel, setShowObjectionPanel] = useState(false);

  const refreshState = useCallback(async () => {
    if (!sessionId) return;
    const state = await api.getTrialState(sessionId);
    setTrialState(state);
    setHp(state.hpRemaining);
    setSelectedLineIndex(state.currentLineIndex);
  }, [sessionId, setHp]);

  useEffect(() => {
    void refreshState();
  }, [refreshState]);

  const goVerdict = async () => {
    if (sessionId) {
      await api.transition({ sessionId, toPhase: 'verdict' });
    }
    useGameStore.getState().setPhase('verdict');
    navigate('/verdict');
  };

  const handleAdvance = async () => {
    if (!sessionId || loading) return;
    setLoading(true);
    try {
      const res = await api.advanceTrial(sessionId);
      setTrialState(res.state);
      setHp(res.state.hpRemaining);
      if (res.state.phase === 'closing') {
        const last = res.state.scriptLine;
        if (last?.action === 'goto_verdict') {
          await goVerdict();
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleObjectionClick = async (lineId: string) => {
    if (!sessionId || loading) return;
    setLoading(true);
    try {
      const res = await api.submitTrialObjection({ sessionId, lineId });
      setTrialState(res.state);
      if (res.state.phase === 'flow2_explanation') {
        setShowObjectionPanel(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleObjectionSubmit = async (evidenceId: string, explanation: string) => {
    if (!sessionId || !trialState?.flow2) return;
    setLoading(true);
    try {
      const res = await api.submitTrialObjection({
        sessionId,
        lineId: trialState.flow2.lineId,
        evidenceId,
        explanation,
      });
      setTrialState(res.state);
      if (res.state.phase === 'flow2_reconstruction') {
        setShowObjectionPanel(false);
        setShowObjection(true);
        setTimeout(() => setShowObjection(false), 2000);
      }
      if (res.state.guilty) {
        setShowObjectionPanel(false);
        damageHp(1);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReconstruct = async (input: string) => {
    if (!sessionId || loading) return;
    setLoading(true);
    try {
      const res = await api.submitTrialReconstruct({ sessionId, input });
      setTrialState(res.state);
      setHp(res.state.hpRemaining);
      if (res.allComplete) {
        setShowObjection(true);
        setTimeout(() => setShowObjection(false), 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBacktrack = async () => {
    if (!sessionId) return;
    const res = await api.trialBacktrackFromGuilty(sessionId);
    setTrialState(res.state);
    setHp(res.state.hpRemaining);
  };

  if (!trialState) {
    return (
      <GameLayout
        phase="trial"
        main={<div className={styles.loading}>加载庭审…</div>}
        bottom={null}
      />
    );
  }

  const phase = trialState.phase;
  const isScriptPhase =
    phase === 'opening' || phase === 'prosecution_evidence' || phase === 'closing';
  const isTestimony = phase === 'testimony';
  const courtDisplay = getCourtDisplay(trialState);

  const renderBottom = () => {
    if (phase === 'guilty') {
      return (
        <div className={styles.guiltyBar}>
          <p>{trialState.lastMessage?.text ?? '本庭宣判：被告人有罪。'}</p>
          <button type="button" className={styles.backtrackBtn} onClick={handleBacktrack}>
            回溯进度
          </button>
        </div>
      );
    }

    if (phase === 'flow2_reconstruction' && trialState.flow2) {
      const steps =
        trialState.testimonyLines.find((l) => l.id === trialState.flow2!.lineId)
          ?.reconstructionSteps ?? [];
      return (
        <div className={styles.bottomStack}>
          {trialState.lastMessage && (
            <DialogBox
              className={dialogStyles.dialogBoxTrial}
              speaker={trialState.lastMessage.speaker}
              text={trialState.lastMessage.text}
              segments={trialState.lastMessage.segments}
              onAdvance={() => setTrialState({ ...trialState, lastMessage: undefined })}
            />
          )}
          <ReconstructionPanel
            step={trialState.flow2.currentStep}
            completedCount={trialState.flow2.completedStepIds.length}
            totalCount={steps.length}
            loading={loading}
            onSubmit={handleReconstruct}
          />
        </div>
      );
    }

    if (isScriptPhase && trialState.scriptLine) {
      return (
        <div className={styles.bottomStack}>
          <DialogBox
            className={dialogStyles.dialogBoxTrial}
            speaker={trialState.scriptLine.speaker}
            text={trialState.scriptLine.text}
            onAdvance={() => {
              if (trialState.scriptLine?.action === 'goto_verdict') {
                void goVerdict();
              } else {
                void handleAdvance();
              }
            }}
          />
        </div>
      );
    }

    if (isTestimony) {
      const line = trialState.testimonyLines[selectedLineIndex];
      const canObject =
        line?.objectionable && !trialState.completedObjections.includes(line.id);
      const canContinue =
        !canObject || trialState.completedObjections.includes(line?.id ?? '');

      return (
        <div className={styles.bottomStack}>
          {!isNaruhodo && <MayaControlsPlaceholder />}
          {trialState.mayaHint && <MayaHintBanner hint={trialState.mayaHint} />}
          {trialState.lastMessage && (
            <DialogBox
              className={dialogStyles.dialogBoxTrial}
              speaker={trialState.lastMessage.speaker}
              text={trialState.lastMessage.text}
              segments={trialState.lastMessage.segments}
              onAdvance={() =>
                setTrialState({ ...trialState, lastMessage: undefined, mayaHint: undefined })
              }
            />
          )}
          <TestimonyBox
            lines={trialState.testimonyLines}
            currentIndex={selectedLineIndex}
            readOnly={!isNaruhodo}
            completedIds={trialState.completedObjections}
            onSelectLine={isNaruhodo ? setSelectedLineIndex : undefined}
            actions={
              isNaruhodo ? (
                <>
                  {canObject && (
                    <button
                      type="button"
                      className={styles.objectionBtn}
                      disabled={loading}
                      onClick={() => line && handleObjectionClick(line.id)}
                    >
                      异议！
                    </button>
                  )}
                  {canContinue && selectedLineIndex === trialState.currentLineIndex && (
                    <button
                      type="button"
                      className={styles.continueBtn}
                      disabled={loading}
                      onClick={handleAdvance}
                    >
                      继续
                    </button>
                  )}
                </>
              ) : undefined
            }
          />
        </div>
      );
    }

    return null;
  };

  return (
    <>
      <GameLayout
        phase="trial"
        main={
          <CourtLayout
            witnessName={trialState.witnessName}
            activePortrait={courtDisplay.portrait}
            portraitSlot={courtDisplay.slot}
            hp={trialState.hpRemaining}
            prosecutionEvidence={trialState.prosecutionEvidence}
            showProsecutionBanner={phase === 'prosecution_evidence'}
            showWitnessTag={courtDisplay.showWitnessTag}
          />
        }
        bottom={renderBottom()}
      />
      <ObjectionOverlay show={showObjection} />
      <AnimatePresence>
        {showObjectionPanel && trialState.flow2 && (
          <ObjectionPanel
            lineText={trialState.flow2.lineText}
            evidence={collected}
            loading={loading}
            onSubmit={handleObjectionSubmit}
            onCancel={() => setShowObjectionPanel(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
