import { useEffect, useRef } from 'react';
import { useStore } from './store';
import { TabBar, Toast } from './components/TabBar';
import { ConfirmDialog } from './components/ConfirmDialog';
import { AislesSheet } from './components/AislesSheet';
import { ManageTagsSheet } from './components/ManageTagsSheet';
import { Onboarding } from './screens/Onboarding';
import { Recipes } from './screens/Recipes';
import { Detail } from './screens/Detail';
import { Pantry } from './screens/Pantry';
import { PantryItem } from './screens/PantryItem';
import { Plan } from './screens/Plan';
import { Grocery } from './screens/Grocery';
import { Shelby } from './screens/Shelby';
import { Sequences } from './screens/Sequences';
import type { Screen } from './types';

const SCREENS: Record<Exclude<Screen, 'onboarding'>, () => JSX.Element | null> = {
  recipes: Recipes,
  detail: Detail,
  pantry: Pantry,
  pantryItem: PantryItem,
  plan: Plan,
  grocery: Grocery,
  shelby: Shelby,
  sequences: Sequences,
};

export default function App() {
  const { state } = useStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const positions = useRef<Partial<Record<Screen, number>>>({});
  const lastScreen = useRef<Screen>(state.screen);

  // Preserve scroll position per tab.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (lastScreen.current !== state.screen) {
      positions.current[lastScreen.current] = el.scrollTop;
      el.scrollTop = positions.current[state.screen] ?? 0;
      lastScreen.current = state.screen;
    }
  }, [state.screen]);

  if (state.screen === 'onboarding' && !state.household) {
    return (
      <div className="app">
        <Onboarding />
      </div>
    );
  }

  const Current = SCREENS[state.screen as Exclude<Screen, 'onboarding'>] ?? Recipes;

  return (
    <div className="app">
      <div className="scroll" ref={scrollRef}>
        <Current key={state.screen} />
      </div>

      <TabBar />

      <AislesSheet />
      <ManageTagsSheet />
      <ConfirmDialog />
      {state.toast && <Toast text={state.toast} />}
    </div>
  );
}
