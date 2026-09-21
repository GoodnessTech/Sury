import type { SuryDataProvider, Treasury, Agent, Policy, Task, Payment, Receipt, Activity } from '@/types';

class MockDataProvider implements SuryDataProvider {
  async getTreasury(): Promise<Treasury | null> { return null; }
  async getAgents(): Promise<Agent[]> { return []; }
  async getPolicies(): Promise<Policy[]> { return []; }
  async getTasks(): Promise<Task[]> { return []; }
  async getPayments(): Promise<Payment[]> { return []; }
  async getReceipts(): Promise<Receipt[]> { return []; }
  async getActivity(): Promise<Activity[]> { return []; }
}

export const mockDataProvider: SuryDataProvider = new MockDataProvider();
