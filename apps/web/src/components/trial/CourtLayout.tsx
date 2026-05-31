import type { EvidenceItem } from '@ace-attorney/shared';
import { CharacterPortrait, type PortraitSlot } from '@/components/vn/CharacterPortrait';
import { HealthBar } from '@/components/common/HealthBar';
import { IMAGES } from '@/config/media';
import styles from './CourtLayout.module.css';

interface CourtLayoutProps {
  witnessName?: string;
  activePortrait?: string;
  portraitSlot?: PortraitSlot;
  hp?: number;
  prosecutionEvidence?: EvidenceItem[];
  showProsecutionBanner?: boolean;
  showWitnessTag?: boolean;
}

export function CourtLayout({
  witnessName,
  activePortrait,
  portraitSlot = 'center',
  hp = 5,
  prosecutionEvidence = [],
  showProsecutionBanner = false,
  showWitnessTag = false,
}: CourtLayoutProps) {
  return (
    <div
      className={styles.scene}
      style={{ backgroundImage: `url(${IMAGES.backgroundTrial})` }}
    >
      <div className={styles.vignette} />

      <div className={styles.hud}>
        <HealthBar hp={hp} />
      </div>

      {showProsecutionBanner && prosecutionEvidence.length > 0 && (
        <div className={styles.prosBanner}>
          <span className={styles.prosLabel}>检方证物</span>
          {prosecutionEvidence.map((e) => e.name).join('、')}
        </div>
      )}

      {showWitnessTag && witnessName && (
        <div className={styles.witnessTag}>{witnessName}</div>
      )}

      <div className={styles.portraitLayer}>
        {activePortrait && (
          <CharacterPortrait
            characterId={activePortrait}
            variant="trial"
            slot={portraitSlot}
          />
        )}
      </div>
    </div>
  );
}
