import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { useAgentStore } from './store/useAgentStore';
import { useWaferStore } from './store/useWaferStore';

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
