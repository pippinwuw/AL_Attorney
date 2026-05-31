import styles from './Button.module.css';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export function Button({ active, className, children, ...props }: ButtonProps) {
  return (
    <button
      className={`${styles.aaButton} ${active ? styles.aaButtonActive : ''} ${className ?? ''}`}
      {...props}
    >
      {children}
    </button>
  );
}
