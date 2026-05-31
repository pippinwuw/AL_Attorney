import type { Hotspot, Scene } from '@ace-attorney/shared';
import styles from './SceneView.module.css';

interface SceneViewProps {
  scene: Scene;
  hotspots: Hotspot[];
  examinedIds: string[];
  disabled?: boolean;
  onHotspotClick: (hotspot: Hotspot) => void;
}

export function SceneView({
  scene,
  hotspots,
  examinedIds,
  disabled,
  onHotspotClick,
}: SceneViewProps) {
  const sceneHotspots = hotspots.filter((h) => h.sceneId === scene.id);

  return (
    <div className={styles.sceneView}>
      <div className={styles.background} style={{ background: scene.background }}>
        {scene.name}
      </div>
      {sceneHotspots.map((hs) => {
        const examined = examinedIds.includes(hs.id);
        return (
          <button
            key={hs.id}
            type="button"
            className={`${styles.hotspot} ${disabled ? styles.hotspotDisabled : ''} ${examined ? styles.hotspotExamined : ''}`}
            style={{
              left: `${hs.x}%`,
              top: `${hs.y}%`,
              width: `${hs.w}%`,
              height: `${hs.h}%`,
            }}
            disabled={disabled}
            onClick={() => onHotspotClick(hs)}
            title={hs.label}
          >
            {hs.label && <span className={styles.label}>{hs.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
