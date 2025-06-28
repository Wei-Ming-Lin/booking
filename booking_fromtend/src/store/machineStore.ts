import { create } from 'zustand';
import type { Machine } from '@/types';

interface MachineStore {
  machines: Machine[];
  setMachines: (machines: Machine[]) => void;
  updateMachineRestrictions: (machineId: string, restrictions: Machine['restrictions']) => void;
}

export const useMachineStore = create<MachineStore>((set) => ({
  machines: [],
  setMachines: (machines) => set({ machines }),
  updateMachineRestrictions: (machineId, restrictions) => 
    set((state) => ({
      machines: state.machines.map((machine) =>
        machine.id === machineId
          ? { ...machine, restrictions }
          : machine
      ),
    })),
})); 