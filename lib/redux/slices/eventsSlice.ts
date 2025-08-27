import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'

// Types
interface Event {
  id: string
  title: string
  description: string | null
  location: string | null
  startDate: string
  endDate: string | null
  isOnline: boolean
  maxAttendees: number | null
  attendeeCount: number
  image: string | null
  createdAt: string
  updatedAt: string
  communityId: string | null
  createdBy: string
  creator: {
    id: string
    name: string | null
    username: string | null
    image: string | null
  }
  community?: {
    id: string
    name: string
    image: string | null
  }
  isAttending: boolean
  isOrganizer: boolean
}

interface EventAttendee {
  id: string
  role: 'ORGANIZER' | 'ATTENDEE'
  joinedAt: string
  user: {
    id: string
    name: string | null
    username: string | null
    image: string | null
  }
}

interface EventsState {
  events: Event[]
  myEvents: Event[]
  currentEvent: Event | null
  eventAttendees: Record<string, EventAttendee[]> // eventId -> attendees
  loading: boolean
  attendeeLoading: Record<string, boolean> // eventId -> loading
  error: string | null
  hasMore: boolean
  page: number
}

// Async thunks
export const fetchEvents = createAsyncThunk(
  'events/fetchEvents',
  async ({ 
    page = 1, 
    limit = 20, 
    communityId, 
    upcoming 
  }: { 
    page?: number
    limit?: number
    communityId?: string
    upcoming?: boolean
  } = {}) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    })
    
    if (communityId) params.append('communityId', communityId)
    if (upcoming !== undefined) params.append('upcoming', upcoming.toString())
    
    const response = await fetch(`/api/events?${params}`)
    if (!response.ok) throw new Error('Failed to fetch events')
    const data = await response.json()
    return { ...data, page }
  }
)

export const fetchMyEvents = createAsyncThunk(
  'events/fetchMyEvents',
  async () => {
    const response = await fetch('/api/events/my-events')
    if (!response.ok) throw new Error('Failed to fetch my events')
    return response.json()
  }
)

export const fetchEventById = createAsyncThunk(
  'events/fetchEventById',
  async (eventId: string) => {
    const response = await fetch(`/api/events/${eventId}`)
    if (!response.ok) throw new Error('Failed to fetch event')
    return response.json()
  }
)

export const createEvent = createAsyncThunk(
  'events/createEvent',
  async (eventData: {
    title: string
    description?: string
    location?: string
    startDate: string
    endDate?: string
    isOnline: boolean
    maxAttendees?: number
    image?: string
    communityId?: string
  }) => {
    const response = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData)
    })
    if (!response.ok) throw new Error('Failed to create event')
    return response.json()
  }
)

export const updateEvent = createAsyncThunk(
  'events/updateEvent',
  async ({ eventId, ...updateData }: {
    eventId: string
    title?: string
    description?: string
    location?: string
    startDate?: string
    endDate?: string
    isOnline?: boolean
    maxAttendees?: number
    image?: string
  }) => {
    const response = await fetch(`/api/events/${eventId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    })
    if (!response.ok) throw new Error('Failed to update event')
    return response.json()
  }
)

export const deleteEvent = createAsyncThunk(
  'events/deleteEvent',
  async (eventId: string) => {
    const response = await fetch(`/api/events/${eventId}`, {
      method: 'DELETE'
    })
    if (!response.ok) throw new Error('Failed to delete event')
    return eventId
  }
)

export const joinEvent = createAsyncThunk(
  'events/joinEvent',
  async (eventId: string) => {
    const response = await fetch(`/api/events/${eventId}/join`, {
      method: 'POST'
    })
    if (!response.ok) throw new Error('Failed to join event')
    return { eventId, ...await response.json() }
  }
)

export const leaveEvent = createAsyncThunk(
  'events/leaveEvent',
  async (eventId: string) => {
    const response = await fetch(`/api/events/${eventId}/leave`, {
      method: 'DELETE'
    })
    if (!response.ok) throw new Error('Failed to leave event')
    return { eventId, ...await response.json() }
  }
)

export const fetchEventAttendees = createAsyncThunk(
  'events/fetchEventAttendees',
  async (eventId: string) => {
    const response = await fetch(`/api/events/${eventId}/attendees`)
    if (!response.ok) throw new Error('Failed to fetch event attendees')
    const data = await response.json()
    return { eventId, attendees: data }
  }
)

export const removeAttendee = createAsyncThunk(
  'events/removeAttendee',
  async ({ eventId, userId }: { eventId: string; userId: string }) => {
    const response = await fetch(`/api/events/${eventId}/attendees/${userId}`, {
      method: 'DELETE'
    })
    if (!response.ok) throw new Error('Failed to remove attendee')
    return { eventId, userId }
  }
)

// Initial state
const initialState: EventsState = {
  events: [],
  myEvents: [],
  currentEvent: null,
  eventAttendees: {},
  loading: false,
  attendeeLoading: {},
  error: null,
  hasMore: true,
  page: 1
}

// Slice
const eventsSlice = createSlice({
  name: 'events',
  initialState,
  reducers: {
    // Real-time updates
    addEvent: (state, action: PayloadAction<Event>) => {
      const event = action.payload
      state.events.unshift(event)
      if (event.isAttending || event.isOrganizer) {
        state.myEvents.unshift(event)
      }
    },
    updateEventInState: (state, action: PayloadAction<Event>) => {
      const updatedEvent = action.payload
      
      // Update in events list
      const eventIndex = state.events.findIndex(e => e.id === updatedEvent.id)
      if (eventIndex !== -1) {
        state.events[eventIndex] = updatedEvent
      }
      
      // Update in my events list
      const myIndex = state.myEvents.findIndex(e => e.id === updatedEvent.id)
      if (myIndex !== -1) {
        if (updatedEvent.isAttending || updatedEvent.isOrganizer) {
          state.myEvents[myIndex] = updatedEvent
        } else {
          state.myEvents.splice(myIndex, 1)
        }
      } else if (updatedEvent.isAttending || updatedEvent.isOrganizer) {
        state.myEvents.push(updatedEvent)
      }
      
      // Update current event
      if (state.currentEvent?.id === updatedEvent.id) {
        state.currentEvent = updatedEvent
      }
    },
    removeEvent: (state, action: PayloadAction<string>) => {
      const eventId = action.payload
      state.events = state.events.filter(e => e.id !== eventId)
      state.myEvents = state.myEvents.filter(e => e.id !== eventId)
      if (state.currentEvent?.id === eventId) {
        state.currentEvent = null
      }
      delete state.eventAttendees[eventId]
      delete state.attendeeLoading[eventId]
    },
    setCurrentEvent: (state, action: PayloadAction<Event | null>) => {
      state.currentEvent = action.payload
    },
    updateEventAttendeeCount: (state, action: PayloadAction<{
      eventId: string
      increment: number
    }>) => {
      const { eventId, increment } = action.payload
      
      // Update in events list
      const event = state.events.find(e => e.id === eventId)
      if (event) {
        event.attendeeCount = Math.max(0, event.attendeeCount + increment)
      }
      
      // Update in my events list
      const myEvent = state.myEvents.find(e => e.id === eventId)
      if (myEvent) {
        myEvent.attendeeCount = Math.max(0, myEvent.attendeeCount + increment)
      }
      
      // Update current event
      if (state.currentEvent?.id === eventId && state.currentEvent) {
        state.currentEvent.attendeeCount = Math.max(0, state.currentEvent.attendeeCount + increment)
      }
    },
    addAttendeeToEvent: (state, action: PayloadAction<{
      eventId: string
      attendee: EventAttendee
    }>) => {
      const { eventId, attendee } = action.payload
      if (!state.eventAttendees[eventId]) {
        state.eventAttendees[eventId] = []
      }
      state.eventAttendees[eventId].push(attendee)
    },
    removeAttendeeFromEvent: (state, action: PayloadAction<{
      eventId: string
      userId: string
    }>) => {
      const { eventId, userId } = action.payload
      if (state.eventAttendees[eventId]) {
        state.eventAttendees[eventId] = state.eventAttendees[eventId]
          .filter(a => a.user.id !== userId)
      }
    },
    resetEvents: (state) => {
      state.events = []
      state.hasMore = true
      state.page = 1
      state.error = null
    }
  },
  extraReducers: (builder) => {
    // Fetch events
    builder.addCase(fetchEvents.pending, (state) => {
      state.loading = true
      state.error = null
    })
    builder.addCase(fetchEvents.fulfilled, (state, action) => {
      const { events, hasMore, page } = action.payload
      state.loading = false
      
      if (page === 1) {
        state.events = events
      } else {
        state.events.push(...events)
      }
      
      state.hasMore = hasMore
      state.page = page
    })
    builder.addCase(fetchEvents.rejected, (state, action) => {
      state.loading = false
      state.error = action.error.message || 'Failed to fetch events'
    })

    // Fetch my events
    builder.addCase(fetchMyEvents.pending, (state) => {
      state.loading = true
      state.error = null
    })
    builder.addCase(fetchMyEvents.fulfilled, (state, action) => {
      state.loading = false
      state.myEvents = action.payload
    })
    builder.addCase(fetchMyEvents.rejected, (state, action) => {
      state.loading = false
      state.error = action.error.message || 'Failed to fetch my events'
    })

    // Fetch event by ID
    builder.addCase(fetchEventById.pending, (state) => {
      state.loading = true
      state.error = null
    })
    builder.addCase(fetchEventById.fulfilled, (state, action) => {
      state.loading = false
      state.currentEvent = action.payload
    })
    builder.addCase(fetchEventById.rejected, (state, action) => {
      state.loading = false
      state.error = action.error.message || 'Failed to fetch event'
    })

    // Create event
    builder.addCase(createEvent.pending, (state) => {
      state.loading = true
      state.error = null
    })
    builder.addCase(createEvent.fulfilled, (state, action) => {
      const event = action.payload
      state.loading = false
      state.events.unshift(event)
      state.myEvents.unshift(event)
    })
    builder.addCase(createEvent.rejected, (state, action) => {
      state.loading = false
      state.error = action.error.message || 'Failed to create event'
    })

    // Update event
    builder.addCase(updateEvent.fulfilled, (state, action) => {
      const updatedEvent = action.payload
      
      const eventIndex = state.events.findIndex(e => e.id === updatedEvent.id)
      if (eventIndex !== -1) {
        state.events[eventIndex] = updatedEvent
      }
      
      const myIndex = state.myEvents.findIndex(e => e.id === updatedEvent.id)
      if (myIndex !== -1) {
        state.myEvents[myIndex] = updatedEvent
      }
      
      if (state.currentEvent?.id === updatedEvent.id) {
        state.currentEvent = updatedEvent
      }
    })

    // Delete event
    builder.addCase(deleteEvent.fulfilled, (state, action) => {
      const eventId = action.payload
      state.events = state.events.filter(e => e.id !== eventId)
      state.myEvents = state.myEvents.filter(e => e.id !== eventId)
      if (state.currentEvent?.id === eventId) {
        state.currentEvent = null
      }
      delete state.eventAttendees[eventId]
      delete state.attendeeLoading[eventId]
    })

    // Join event
    builder.addCase(joinEvent.fulfilled, (state, action) => {
      const { eventId } = action.payload
      
      // Update event attendance status
      const event = state.events.find(e => e.id === eventId)
      if (event) {
        event.isAttending = true
        event.attendeeCount += 1
        state.myEvents.push(event)
      }
      
      if (state.currentEvent?.id === eventId && state.currentEvent) {
        state.currentEvent.isAttending = true
        state.currentEvent.attendeeCount += 1
      }
    })

    // Leave event
    builder.addCase(leaveEvent.fulfilled, (state, action) => {
      const { eventId } = action.payload
      
      // Update event attendance status
      const event = state.events.find(e => e.id === eventId)
      if (event) {
        event.isAttending = false
        event.attendeeCount = Math.max(0, event.attendeeCount - 1)
      }
      
      // Remove from my events
      state.myEvents = state.myEvents.filter(e => e.id !== eventId)
      
      if (state.currentEvent?.id === eventId && state.currentEvent) {
        state.currentEvent.isAttending = false
        state.currentEvent.attendeeCount = Math.max(0, state.currentEvent.attendeeCount - 1)
      }
    })

    // Fetch event attendees
    builder.addCase(fetchEventAttendees.pending, (state, action) => {
      const eventId = action.meta.arg
      state.attendeeLoading[eventId] = true
      state.error = null
    })
    builder.addCase(fetchEventAttendees.fulfilled, (state, action) => {
      const { eventId, attendees } = action.payload
      state.attendeeLoading[eventId] = false
      state.eventAttendees[eventId] = attendees
    })
    builder.addCase(fetchEventAttendees.rejected, (state, action) => {
      const eventId = action.meta.arg
      state.attendeeLoading[eventId] = false
      state.error = action.error.message || 'Failed to fetch event attendees'
    })

    // Remove attendee
    builder.addCase(removeAttendee.fulfilled, (state, action) => {
      const { eventId, userId } = action.payload
      if (state.eventAttendees[eventId]) {
        state.eventAttendees[eventId] = state.eventAttendees[eventId]
          .filter(a => a.user.id !== userId)
      }
      
      // Update attendee count
      const event = state.events.find(e => e.id === eventId)
      if (event) {
        event.attendeeCount = Math.max(0, event.attendeeCount - 1)
      }
      
      const myEvent = state.myEvents.find(e => e.id === eventId)
      if (myEvent) {
        myEvent.attendeeCount = Math.max(0, myEvent.attendeeCount - 1)
      }
      
      if (state.currentEvent?.id === eventId && state.currentEvent) {
        state.currentEvent.attendeeCount = Math.max(0, state.currentEvent.attendeeCount - 1)
      }
    })
  }
})

export const {
  addEvent,
  updateEventInState,
  removeEvent,
  setCurrentEvent,
  updateEventAttendeeCount,
  addAttendeeToEvent,
  removeAttendeeFromEvent,
  resetEvents
} = eventsSlice.actions
export default eventsSlice.reducer
