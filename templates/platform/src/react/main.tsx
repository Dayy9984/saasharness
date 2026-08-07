import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { UxLab } from './ux-lab/UxLab';
import { AdminPage } from './admin/AdminPage';
import { OnboardingPage } from '../modules/onboarding/public';
import './styles.css';

const currentPath = window.location.pathname;
const component = currentPath.startsWith('/__ux')
  ? <UxLab />
  : currentPath.startsWith('/__admin')
    ? <AdminPage />
    : currentPath.startsWith('/onboarding')
      ? <OnboardingPage />
      : <App />;

createRoot(document.getElementById('root')!).render(
  <StrictMode>{component}</StrictMode>,
);
