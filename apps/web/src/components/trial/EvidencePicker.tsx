import { motion } from 'framer-motion';
import type { EvidenceItem } from '@ace-attorney/shared';
import styles from './EvidencePicker.module.css';

interface EvidencePickerProps {
  items: EvidenceItem[];
  onSelect: (id: string) => void;
  onCancel: () => void;
}

export function EvidencePicker({ items, onSelect, onCancel }: EvidencePickerProps) {
  return (
    <motion.div
      className={styles.overlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onCancel}
    >
      <motion.div
        className={styles.panel}
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.title}>选择证物</div>
        <motion.div
          className={styles.grid}
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
        >
          {items.map((item) => (
            <motion.button
              key={item.id}
              type="button"
              className={styles.item}
              variants={{ hidden: { opacity: 0, scale: 0.8 }, visible: { opacity: 1, scale: 1 } }}
              onClick={() => onSelect(item.id)}
            >
              {item.name}
            </motion.button>
          ))}
        </motion.div>
        <button type="button" className={styles.cancel} onClick={onCancel}>
          取消
        </button>
      </motion.div>
    </motion.div>
  );
}
