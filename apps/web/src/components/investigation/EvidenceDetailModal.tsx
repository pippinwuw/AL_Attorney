import { motion } from 'framer-motion';
import type { EvidenceItem } from '@ace-attorney/shared';
import styles from './EvidenceDetailModal.module.css';

interface EvidenceDetailModalProps {
  item: EvidenceItem | null;
  onClose: () => void;
}

export function EvidenceDetailModal({ item, onClose }: EvidenceDetailModalProps) {
  if (!item) return null;

  return (
    <motion.div
      className={styles.overlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className={styles.modal}
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.title}>{item.name}</div>
        <div className={styles.desc}>{item.description}</div>
        <button type="button" className={styles.closeBtn} onClick={onClose}>
          关闭
        </button>
      </motion.div>
    </motion.div>
  );
}
