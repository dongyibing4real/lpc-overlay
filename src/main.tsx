import { createRoot } from 'react-dom/client';
import './index.css';
import App from './app/AppShell.tsx';
import { useAgentStore } from './state/agentStore';
import { useWaferStore } from './state/waferStore';

if (typeof window !== 'undefined' && window.location.search.includes('showcase=1')) {
  (
    window as typeof window & {
      __LPC_SHOWCASE__?: {
        agentStore: typeof useAgentStore;
        waferStore: typeof useWaferStore;
      };
    }
  ).__LPC_SHOWCASE__ = {
    agentStore: useAgentStore,
    waferStore: useWaferStore,
  };
}

createRoot(document.getElementById('root')!).render(<App />);
