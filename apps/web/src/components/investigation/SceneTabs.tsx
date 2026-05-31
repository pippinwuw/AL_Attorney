import type { Scene } from '@ace-attorney/shared';
import styles from './SceneTabs.module.css';

interface SceneTabsProps {
  scenes: Scene[];
  currentId: string;
  disabled?: boolean;
  onChange: (id: string) => void;
}

export function SceneTabs({ scenes, currentId, disabled, onChange }: SceneTabsProps) {
  return (
    <div className={styles.tabs}>
      {scenes.map((scene) => {
        const locked = scene.unlocked === false;
        return (
          <button
            key={scene.id}
            type="button"
            className={`${styles.tab} ${currentId === scene.id ? styles.tabActive : ''} ${locked ? styles.tabLocked : ''}`}
            disabled={disabled || locked}
            onClick={() => onChange(scene.id)}
          >
            {scene.name}
          </button>
        );
      })}
    </div>
  );
}
