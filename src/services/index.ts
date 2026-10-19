import { supabase } from '@/lib/supabase'
import { HttpAccountService } from './account/http'
import { LocalAccountService } from './account/local'
import { FallbackMarketDataService } from './fallback'
import { HttpAIService } from './http/ai'
import { HttpMarketDataService } from './http/marketData'
import { MockAIService } from './mock/ai'
import { MockMarketDataService } from './mock/marketData'
import type { AccountService, AIService, MarketDataService } from './types'

const forceMock = import.meta.env.VITE_DATA === 'mock'

/** True when accounts live on the backend (Supabase auth + FastAPI); false in offline demo mode. */
export const backendAccounts = !forceMock && supabase !== null

export const marketData: MarketDataService = forceMock
  ? new MockMarketDataService()
  : new FallbackMarketDataService(new HttpMarketDataService(), new MockMarketDataService())

export const ai: AIService = backendAccounts ? new HttpAIService(new MockAIService()) : new MockAIService()

export const accounts: AccountService = backendAccounts ? new HttpAccountService() : new LocalAccountService()

export type * from './types'
