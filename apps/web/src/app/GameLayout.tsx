import { motion } from 'framer-motion';
import type { GamePhase } from '@ace-attorney/shared';
import { TopBar } from '@/components/common/TopBar';
import { MayaChatPanel } from '@/components/maya/MayaChatPanel';
import { CourtRecordPanel } from '@/components/courtRecord/CourtRecordPanel';
import { useGameStore } from '@/stores/gameStore';
import styles from './GameLayout.module.css';

interface GameLayoutProps {
  phase: GamePhase;
  sceneName?: string;
  main: React.ReactNode;
  bottom: React.ReactNode;
}

export function GameLayout({ phase, sceneName, main, bottom }: GameLayoutProps) {
  const penaltyShake = useGameStore((s) => s.penaltyShake);

  return (
    <div className={styles.layout}>
      <TopBar phase={phase} sceneName={sceneName} />
      <div className={styles.body}>
        <motion.div
          className={styles.mainStage}
          animate={penaltyShake ? { x: [0, -8, 8, -6, 6, -3, 3, 0] } : { x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {main}
          </div>
          <div className={styles.bottomPanel}>{bottom}</div>
        </motion.div>
        <MayaChatPanel />
      </div>
      <CourtRecordPanel />
    </div>
  );
}
