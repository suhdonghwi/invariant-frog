import { create } from 'zustand';

export type SolverStatus = 'idle' | 'loading' | 'ready' | 'failed';

export const useSolver = create<{ status: SolverStatus }>(() => ({ status: 'idle' }));
