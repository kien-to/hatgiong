import { apiJSON } from '@/lib/api'

export interface OwnedClass {
  id: string
  name: string
  joinCode: string
  members: number
}

export interface JoinedClass {
  id: string
  name: string
  teacher: string
}

export interface ClassMemberReport {
  name: string
  joinedAt: number
  returnPct: number
  positions: number
  maxWeightPct: number
  cashPct: number
  fills: number
  reasonedOrders: number
  lessonsDone: number
  avgBestPct: number | null
  avgFirstPct: number | null
  reviews: number
  resets: number
  lastActive: number | null
}

export interface ClassReport {
  id: string
  name: string
  joinCode: string
  members: ClassMemberReport[]
}

export const classesApi = {
  list: () => apiJSON<{ owned: OwnedClass[]; joined: JoinedClass[] }>('/classes'),
  create: (name: string) => apiJSON<OwnedClass>('/classes', { method: 'POST', body: JSON.stringify({ name }) }),
  join: (code: string) => apiJSON<{ id: string; name: string }>('/classes/join', { method: 'POST', body: JSON.stringify({ code }) }),
  leave: (id: string) => apiJSON<void>(`/classes/${id}/membership`, { method: 'DELETE' }),
  report: (id: string) => apiJSON<ClassReport>(`/classes/${id}`),
}
