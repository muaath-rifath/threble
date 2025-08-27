import { z } from 'zod'

export const connectionActionSchema = z.object({
  targetUserId: z.string().cuid('Invalid user ID format'),
  action: z.enum(['send_request', 'accept', 'reject', 'remove'])
})

export const connectionRequestsQuerySchema = z.object({
  type: z.enum(['sent', 'received']).optional().default('received'),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20)
})

export const connectionListQuerySchema = z.object({
  status: z.enum(['PENDING', 'ACCEPTED', 'REJECTED', 'BLOCKED']).optional().default('ACCEPTED'),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20)
})

export const connectionSuggestionsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional().default(10)
})

export type ConnectionAction = z.infer<typeof connectionActionSchema>
export type ConnectionRequestsQuery = z.infer<typeof connectionRequestsQuerySchema>
export type ConnectionListQuery = z.infer<typeof connectionListQuerySchema>
export type ConnectionSuggestionsQuery = z.infer<typeof connectionSuggestionsQuerySchema>
