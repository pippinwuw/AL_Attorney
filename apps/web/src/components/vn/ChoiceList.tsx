import { motion } from 'framer-motion';
import styles from './ChoiceList.module.css';

interface Choice {
  id: string;
  label: string;
}

interface ChoiceListProps {
  options: Choice[];
  onChoice: (id: string) => void;
}

export function ChoiceList({ options, onChoice }: ChoiceListProps) {
  return (
    <motion.div
      className={styles.choiceList}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.08 } },
      }}
    >
      {options.map((opt) => (
        <motion.button
          key={opt.id}
          type="button"
          className={styles.choiceItem}
          variants={{ hidden: { opacity: 0, x: -20 }, visible: { opacity: 1, x: 0 } }}
          onClick={() => onChoice(opt.id)}
        >
          {opt.label}
        </motion.button>
      ))}
    </motion.div>
  );
}
