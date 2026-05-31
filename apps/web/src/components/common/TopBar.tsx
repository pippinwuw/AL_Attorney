import type { GamePhase } from '@ace-attorney/shared';
import { useMayaChatStore } from '@/stores/mayaChatStore';
import { useCourtRecordStore } from '@/stores/courtRecordStore';
import { useRoleStore } from '@/stores/roleStore';
import styles from './TopBar.module.css';

const phaseLabels: Record<GamePhase, string> = {
  prologue: '前情提要',
  investigation: '庭前调查',
  trial: '开庭',
  verdict: '宣判',
};

interface TopBarProps {
  phase: GamePhase;
  sceneName?: string;
}

export function TopBar({ phase, sceneName }: TopBarProps) {
  const { isOpen, setOpen } = useMayaChatStore();
  const { isOpen: recordOpen, setOpen: setRecordOpen } = useCourtRecordStore();
  const playerRole = useRoleStore((s) => s.playerRole);

  return (
    <header className={styles.topBar}>
      <div className={styles.phaseLabel}>
        ◼ {phaseLabels[phase]}
        {sceneName ? ` — ${sceneName}` : ''}
      </div>
      <div className={styles.actions}>
        <span className={styles.roleBadge}>
          {playerRole === 'naruhodo' ? '成步堂' : '真宵'}
        </span>
        <button
          type="button"
          className={`${styles.iconBtn} ${recordOpen ? styles.iconBtnActive : ''}`}
          onClick={() => setRecordOpen(!recordOpen)}
        >
          📋 法庭记录
        </button>
        <button
          type="button"
          className={`${styles.iconBtn} ${isOpen ? styles.iconBtnActive : ''}`}
          onClick={() => setOpen(!isOpen)}
        >
          💬 真宵
        </button>
        <button type="button" className={styles.iconBtn}>
          菜单
        </button>
      </div>
    </header>
  );
}
