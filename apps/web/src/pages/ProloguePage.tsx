import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameLayout } from '@/app/GameLayout';
import { DialogBox } from '@/components/vn/DialogBox';
import { ChoiceList } from '@/components/vn/ChoiceList';
import { CharacterPortrait } from '@/components/vn/CharacterPortrait';
import { MayaControlsPlaceholder } from '@/components/maya/MayaControlsPlaceholder';
import { useRoleStore } from '@/stores/roleStore';
import { useGameStore } from '@/stores/gameStore';
import { api } from '@/services/api';
import { case01 } from '@/data/mock/caseData';
import { IMAGES } from '@/config/media';
import type { DialogLine } from '@ace-attorney/shared';
import styles from './ProloguePage.module.css';

export function ProloguePage() {
  const navigate = useNavigate();
  const sessionId = useGameStore((s) => s.sessionId);
  const isNaruhodo = useRoleStore((s) => s.playerRole === 'naruhodo');
  const [currentId, setCurrentId] = useState(case01.prologue.startId);

  const line: DialogLine | undefined = case01.prologue.dialogs[currentId];

  const advance = useCallback(async () => {
    if (!line) return;

    if (sessionId) {
      await api.reportEvent({ sessionId, eventType: 'dialog', payload: { dialogId: line.id } });
    }

    if (line.action === 'goto_investigation') {
      if (sessionId) {
        await api.transition({ sessionId, toPhase: 'investigation' });
      }
      useGameStore.getState().setPhase('investigation');
      navigate('/investigation');
      return;
    }

    if (line.choices?.length) return;

    if (line.nextId) {
      setCurrentId(line.nextId);
    }
  }, [line, sessionId, navigate]);

  const onChoice = (choiceId: string) => {
    const choice = line?.choices?.find((c) => c.id === choiceId);
    if (choice) setCurrentId(choice.nextId);
  };

  if (!line) return null;

  const portraitSide =
    line.portrait === 'naruhodo' || line.portrait === 'maya' ? 'left' : 'right';

  return (
    <GameLayout
      phase="prologue"
      main={
        <div
          className={styles.stage}
          style={{ backgroundImage: `url(${IMAGES.backgroundTrial})` }}
        >
          <CharacterPortrait characterId={line.portrait} side={portraitSide} />
        </div>
      }
      bottom={
        <>
          {!isNaruhodo && <MayaControlsPlaceholder />}
          {line.choices?.length ? (
            <ChoiceList options={line.choices} onChoice={onChoice} />
          ) : (
            <DialogBox speaker={line.speaker} text={line.text} onAdvance={advance} />
          )}
        </>
      }
    />
  );
}
