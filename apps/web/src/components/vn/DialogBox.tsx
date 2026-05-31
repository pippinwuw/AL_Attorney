import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { DialogueSpeechSegment } from '@ace-attorney/shared';
import styles from './DialogBox.module.css';

interface DialogBoxProps {
  speaker: string;
  text: string;
  /** LLM 分段台词：逐段打字，段间点击继续 */
  segments?: DialogueSpeechSegment[];
  onAdvance?: () => void;
  charDelay?: number;
  showContinue?: boolean;
  className?: string;
}

export function DialogBox({
  speaker,
  text,
  segments,
  onAdvance,
  charDelay = 30,
  showContinue = true,
  className,
}: DialogBoxProps) {
  const lines = segments?.length ? segments : [{ text }];
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [displayed, setDisplayed] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  const currentText = lines[segmentIndex]?.text ?? text;

  useEffect(() => {
    setSegmentIndex(0);
  }, [speaker, text, segments]);

  useEffect(() => {
    setDisplayed('');
    setIsTyping(true);
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setDisplayed(currentText.slice(0, i));
      if (i >= currentText.length) {
        clearInterval(timer);
        setIsTyping(false);
      }
    }, charDelay);
    return () => clearInterval(timer);
  }, [currentText, charDelay, segmentIndex]);

  const handleClick = useCallback(() => {
    if (isTyping) {
      setDisplayed(currentText);
      setIsTyping(false);
      return;
    }
    if (segmentIndex < lines.length - 1) {
      setSegmentIndex((i) => i + 1);
      return;
    }
    onAdvance?.();
  }, [isTyping, currentText, segmentIndex, lines.length, onAdvance]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        handleClick();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleClick]);

  const segmentHint =
    lines.length > 1 ? ` (${segmentIndex + 1}/${lines.length})` : '';

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${speaker}-${segmentIndex}-${currentText.slice(0, 16)}`}
        className={`${styles.dialogBox} ${className ?? ''}`}
        onClick={handleClick}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 10, opacity: 0 }}
        transition={{ duration: 0.25 }}
      >
        <div className={styles.nameplate}>
          {speaker}
          {segmentHint}
        </div>
        <div className={styles.content}>
          {displayed}
          {isTyping && <span className={styles.cursor}>▌</span>}
        </div>
        {showContinue && !isTyping && (
          <span className={styles.continueHint}>
            ▼ {segmentIndex < lines.length - 1 ? '下一句' : '继续'}
          </span>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
