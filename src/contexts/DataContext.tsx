import React, { createContext, useContext, useState, useCallback, ReactNode, useRef } from 'react';
import { EventTemplate, GameEvent, Participant, EventStatus, EventPresence } from '@/types';
import { apiFetch, buildApiUrl } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface DataContextType {
  templates: EventTemplate[];
  events: GameEvent[];
  participants: Record<string, Participant[]>;
  presence: Record<string, EventPresence[]>;
  isLoading: boolean;
  createTemplate: (t: Omit<EventTemplate, 'id' | 'createdAt'>) => Promise<EventTemplate>;
  updateTemplate: (id: string, t: Partial<EventTemplate>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  duplicateTemplate: (id: string) => Promise<EventTemplate>;
  createEvent: (e: Omit<GameEvent, 'id' | 'createdAt' | 'updatedAt' | 'usedRounds'>) => Promise<GameEvent>;
  updateEvent: (id: string, e: Partial<GameEvent>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  duplicateEvent: (id: string) => Promise<GameEvent>;
  changeEventStatus: (id: string, status: EventStatus) => Promise<void>;
  addRound: (id: string) => Promise<void>;
  addParticipant: (eventId: string, name: string, discordId?: string, groupDescription?: string, roleId?: string) => Promise<void>;
  removeParticipant: (eventId: string, participantId: string) => Promise<void>;
  updateParticipantRole: (eventId: string, participantId: string, roleId: string | undefined) => Promise<void>;
  updateScore: (eventId: string, participantId: string, columnName: string, value: number | string) => Promise<void>;
  getEventParticipants: (eventId: string) => Participant[];
  getEventPresence: (eventId: string) => EventPresence[];
  updatePresenceSelection: (
    eventId: string,
    selection: { participantId: string; columnName: string } | null,
    isTyping?: boolean
  ) => Promise<void>;
  subscribeToEvent: (eventId: string) => () => void;
}

type EventStreamPayload = {
  type: 'snapshot' | 'participants_updated' | 'event_updated' | 'event_deleted' | 'presence_updated';
  eventId: string;
  event?: GameEvent;
  participants?: Participant[];
  presence?: EventPresence[];
  timestamp: string;
};

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<EventTemplate[]>([]);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [participants, setParticipants] = useState<Record<string, Participant[]>>({});
  const [presence, setPresence] = useState<Record<string, EventPresence[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const eventStreamsRef = useRef<Record<string, { source: EventSource; subscribers: number }>>({});

  const closeAllEventStreams = useCallback(() => {
    const streams = eventStreamsRef.current;
    for (const eventId of Object.keys(streams)) {
      streams[eventId].source.close();
    }
    eventStreamsRef.current = {};
  }, []);

  const applyEventStreamPayload = useCallback((payload: EventStreamPayload) => {
    if (payload.type === 'event_deleted') {
      setEvents(prev => prev.filter(event => event.id !== payload.eventId));
      setParticipants(prev => {
        const { [payload.eventId]: _removed, ...rest } = prev;
        return rest;
      });
      setPresence(prev => {
        const { [payload.eventId]: _removed, ...rest } = prev;
        return rest;
      });
      return;
    }

    if (payload.event) {
      setEvents(prev => {
        const exists = prev.some(event => event.id === payload.event!.id);
        if (!exists) return [payload.event!, ...prev];
        return prev.map(event => (event.id === payload.event!.id ? payload.event! : event));
      });
    }

    if (Array.isArray(payload.participants)) {
      setParticipants(prev => ({ ...prev, [payload.eventId]: payload.participants! }));
    }

    if (Array.isArray(payload.presence)) {
      setPresence(prev => ({ ...prev, [payload.eventId]: payload.presence! }));
    }
  }, []);

  const subscribeToEvent = useCallback((eventId: string) => {
    if (!user?.id || !eventId) {
      return () => {};
    }

    const streams = eventStreamsRef.current;
    const existing = streams[eventId];
    if (existing) {
      existing.subscribers += 1;
      return () => {
        const current = eventStreamsRef.current[eventId];
        if (!current) return;
        current.subscribers -= 1;
        if (current.subscribers <= 0) {
          current.source.close();
          delete eventStreamsRef.current[eventId];
        }
      };
    }

    const streamUrl = buildApiUrl(`/api/data/events/${eventId}/stream?userId=${encodeURIComponent(user.id)}`);
    const source = new EventSource(streamUrl);
    const onPayload = (event: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(event.data) as EventStreamPayload;
        applyEventStreamPayload(payload);
      } catch {
        // Ignore malformed stream events to keep the connection alive.
      }
    };

    source.addEventListener('snapshot', onPayload as EventListener);
    source.addEventListener('participants_updated', onPayload as EventListener);
    source.addEventListener('event_updated', onPayload as EventListener);
    source.addEventListener('event_deleted', onPayload as EventListener);
    source.addEventListener('presence_updated', onPayload as EventListener);

    streams[eventId] = { source, subscribers: 1 };

    return () => {
      const current = eventStreamsRef.current[eventId];
      if (!current) return;
      current.subscribers -= 1;
      if (current.subscribers <= 0) {
        current.source.close();
        delete eventStreamsRef.current[eventId];
      }
    };
  }, [applyEventStreamPayload, user?.id]);

  const loadBootstrap = useCallback(async () => {
    const response = await apiFetch<{
      templates: EventTemplate[];
      events: GameEvent[];
      participants: Record<string, Participant[]>;
    }>('/api/data/bootstrap');
    setTemplates(response.templates);
    setEvents(response.events);
    setParticipants(response.participants);
  }, []);

  React.useEffect(() => {
    let mounted = true;

    // Data is backend-driven; only bootstrap after authentication is available.
    if (!user) {
      closeAllEventStreams();
      setTemplates([]);
      setEvents([]);
      setParticipants({});
      setPresence({});
      setIsLoading(false);
      return () => {
        mounted = false;
      };
    }

    setIsLoading(true);
    loadBootstrap()
      .catch(() => {
        if (mounted) {
          setTemplates([]);
          setEvents([]);
          setParticipants({});
          setPresence({});
        }
      })
      .finally(() => {
        if (mounted) {
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [closeAllEventStreams, loadBootstrap, user]);

  React.useEffect(() => {
    return () => {
      closeAllEventStreams();
    };
  }, [closeAllEventStreams]);

  const createTemplate = useCallback(async (t: Omit<EventTemplate, 'id' | 'createdAt'>) => {
    const response = await apiFetch<{ template: EventTemplate }>('/api/data/templates', {
      method: 'POST',
      body: JSON.stringify(t),
    });
    if (response.template.isDefault) {
      setTemplates(ts => ts.map(x => ({ ...x, isDefault: false })).concat(response.template));
    } else {
      setTemplates(ts => [...ts, response.template]);
    }
    return response.template;
  }, []);

  const updateTemplate = useCallback(async (id: string, updates: Partial<EventTemplate>) => {
    const response = await apiFetch<{ template: EventTemplate }>(`/api/data/templates/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    setTemplates(ts => {
      let result = ts.map(t => t.id === id ? response.template : t);
      if (response.template.isDefault) {
        result = result.map(t => ({ ...t, isDefault: t.id === id }));
      }
      return result;
    });
  }, []);

  const deleteTemplate = useCallback(async (id: string) => {
    await apiFetch<void>(`/api/data/templates/${id}`, { method: 'DELETE' });
    setTemplates(ts => ts.filter(t => t.id !== id));
  }, []);

  const duplicateTemplate = useCallback(async (id: string) => {
    const response = await apiFetch<{ template: EventTemplate }>(`/api/data/templates/${id}/duplicate`, {
      method: 'POST',
    });
    setTemplates(ts => [...ts, response.template]);
    return response.template;
  }, []);

  const createEvent = useCallback(async (e: Omit<GameEvent, 'id' | 'createdAt' | 'updatedAt' | 'usedRounds'>) => {
    const response = await apiFetch<{ event: GameEvent }>('/api/data/events', {
      method: 'POST',
      body: JSON.stringify(e),
    });
    setEvents(es => [...es, response.event]);
    setParticipants(p => ({ ...p, [response.event.id]: [] }));
    return response.event;
  }, []);

  const updateEvent = useCallback(async (id: string, updates: Partial<GameEvent>) => {
    const response = await apiFetch<{ event: GameEvent }>(`/api/data/events/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    setEvents(es => es.map(e => e.id === id ? response.event : e));
  }, []);

  const deleteEvent = useCallback(async (id: string) => {
    await apiFetch<void>(`/api/data/events/${id}`, { method: 'DELETE' });
    setEvents(es => es.filter(e => e.id !== id));
    setParticipants(p => { const { [id]: _, ...rest } = p; return rest; });
  }, []);

  const duplicateEvent = useCallback(async (id: string) => {
    const response = await apiFetch<{ event: GameEvent }>(`/api/data/events/${id}/duplicate`, {
      method: 'POST',
    });
    setEvents(es => [...es, response.event]);
    setParticipants(p => ({ ...p, [response.event.id]: [] }));
    return response.event;
  }, []);

  const changeEventStatus = useCallback(async (id: string, status: EventStatus) => {
    const response = await apiFetch<{ event: GameEvent; participants: Participant[] }>(`/api/data/events/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
    setEvents(es => es.map(e => e.id === id ? response.event : e));
    setParticipants(p => ({ ...p, [id]: response.participants }));
  }, []);

  const addRound = useCallback(async (id: string) => {
    const response = await apiFetch<{ event: GameEvent; participants: Participant[] }>(`/api/data/events/${id}/round`, {
      method: 'POST',
    });
    setEvents(es => es.map(e => e.id === id ? response.event : e));
    setParticipants(p => ({ ...p, [id]: response.participants }));
  }, []);

  const addParticipant = useCallback(async (eventId: string, name: string, discordId?: string, groupDescription?: string, roleId?: string) => {
    const response = await apiFetch<{ participants: Participant[] }>(`/api/data/events/${eventId}/participants`, {
      method: 'POST',
      body: JSON.stringify({ name, discordId, groupDescription, roleId }),
    });
    setParticipants(p => ({ ...p, [eventId]: response.participants }));
  }, []);

  const removeParticipant = useCallback(async (eventId: string, participantId: string) => {
    const response = await apiFetch<{ participants: Participant[] }>(`/api/data/events/${eventId}/participants/${participantId}`, {
      method: 'DELETE',
    });
    setParticipants(p => ({ ...p, [eventId]: response.participants }));
  }, []);

  const updateParticipantRole = useCallback(async (eventId: string, participantId: string, roleId: string | undefined) => {
    const response = await apiFetch<{ participants: Participant[] }>(`/api/data/events/${eventId}/participants/${participantId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ roleId }),
    });
    setParticipants(p => ({ ...p, [eventId]: response.participants }));
  }, []);

  const updateScore = useCallback(async (eventId: string, participantId: string, columnName: string, value: number | string) => {
    const response = await apiFetch<{ participants: Participant[] }>(`/api/data/events/${eventId}/participants/${participantId}/score`, {
      method: 'PATCH',
      body: JSON.stringify({ columnName, value }),
    });
    setParticipants(p => ({ ...p, [eventId]: response.participants }));
  }, []);

  const getEventParticipants = useCallback((eventId: string) => {
    return participants[eventId] || [];
  }, [participants]);

  const getEventPresence = useCallback((eventId: string) => {
    return presence[eventId] || [];
  }, [presence]);

  const updatePresenceSelection = useCallback(async (
    eventId: string,
    selection: { participantId: string; columnName: string } | null,
    isTyping = false
  ) => {
    await apiFetch<void>(`/api/data/events/${eventId}/presence`, {
      method: 'PATCH',
      body: JSON.stringify({
        participantId: selection?.participantId ?? null,
        columnName: selection?.columnName ?? null,
        isTyping,
      }),
    });
  }, []);

  return (
    <DataContext.Provider value={{
      templates, events, participants, presence,
      isLoading,
      createTemplate, updateTemplate, deleteTemplate, duplicateTemplate,
      createEvent, updateEvent, deleteEvent, duplicateEvent,
      changeEventStatus, addRound,
      addParticipant, removeParticipant, updateParticipantRole, updateScore, getEventParticipants,
      getEventPresence, updatePresenceSelection,
      subscribeToEvent,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
