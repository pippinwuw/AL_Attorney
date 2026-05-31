import { motion, AnimatePresence } from 'framer-motion';
import { IMAGES } from '@/config/media';
import styles from './ObjectionOverlay.module.css';

interface ObjectionOverlayProps {
  show: boolean;
}

export function ObjectionOverlay({ show }: ObjectionOverlayProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <motion.img
            className={styles.effectImage}
            src={IMAGES.objectionSuccess}
            alt="异议成立"
            draggable={false}
            initial={{ scale: 0.3, rotate: -8, opacity: 0 }}
            animate={{ scale: [0.3, 1.15, 1], rotate: [-8, 4, 0], opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 18 }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
