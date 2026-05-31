import { motion } from 'framer-motion';
import { getFigureUrl } from '@/config/media';
import styles from './CharacterPortrait.module.css';

export type PortraitSlot = 'left' | 'center' | 'right';

interface CharacterPortraitProps {
  characterId?: string;
  side?: 'left' | 'right';
  /** 庭审场景专用：按槽位定位，高度自适应 */
  variant?: 'default' | 'trial';
  slot?: PortraitSlot;
}

const names: Record<string, string> = {
  naruhodo: '成步堂',
  maya: '真宵',
  judge: '法官',
  prosecutor: '检察官',
  witness: '证人',
};

export function CharacterPortrait({
  characterId,
  side = 'left',
  variant = 'default',
  slot,
}: CharacterPortraitProps) {
  if (!characterId) return null;

  const imageUrl = getFigureUrl(characterId);
  const label = names[characterId] ?? characterId;

  const trialSlot = slot ?? (side === 'left' ? 'left' : 'right');
  const positionClass =
    variant === 'trial'
      ? styles[`trial${trialSlot.charAt(0).toUpperCase()}${trialSlot.slice(1)}` as keyof typeof styles]
      : side === 'left'
        ? styles.left
        : styles.right;

  return (
    <motion.div
      className={`${styles.portrait} ${variant === 'trial' ? styles.portraitTrial : ''} ${positionClass}`}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.35 }}
    >
      {imageUrl ? (
        <img className={styles.image} src={imageUrl} alt={label} draggable={false} />
      ) : (
        <div className={styles.placeholder}>
          <span className={styles.label}>{label}</span>
        </div>
      )}
    </motion.div>
  );
}
