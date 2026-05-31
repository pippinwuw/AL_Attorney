import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { BgmPlayer } from '@/components/audio/BgmPlayer';
import { TitlePage } from '@/pages/TitlePage';
import { ProloguePage } from '@/pages/ProloguePage';
import { InvestigationPage } from '@/pages/InvestigationPage';
import { TrialPage } from '@/pages/TrialPage';
import { VerdictPage } from '@/pages/VerdictPage';

export function AppRouter() {
  return (
    <BrowserRouter>
      <BgmPlayer />
      <Routes>
        <Route path="/" element={<TitlePage />} />
        <Route path="/prologue" element={<ProloguePage />} />
        <Route path="/investigation" element={<InvestigationPage />} />
        <Route path="/trial" element={<TrialPage />} />
        <Route path="/verdict" element={<VerdictPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
