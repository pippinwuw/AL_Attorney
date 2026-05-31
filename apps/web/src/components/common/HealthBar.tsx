import styles from './HealthBar.module.css';

interface HealthBarProps {
  hp: number;
  maxHp?: number;
}

export function HealthBar({ hp, maxHp = 5 }: HealthBarProps) {
  return (
    <div className={styles.healthBar}>
      <span className={styles.label}>HP</span>
      {Array.from({ length: maxHp }, (_, i) => (
        <span
          key={i}
          className={`${styles.heart} ${i < hp ? styles.heartFull : styles.heartEmpty}`}
        >
          {i < hp ? '♥' : '♡'}
        </span>
      ))}
    </div>
  );
}
