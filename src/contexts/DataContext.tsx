import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { EventTemplate, GameEvent, Participant, EventStatus } from '@/types';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface DataContextType {
  templates: EventTemplate[];
  events: GameEvent[];
  participants: Record<string, Participant[]>;
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
}

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<EventTemplate[]>([]);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [participants, setParticipants] = useState<Record<string, Participant[]>>({});
  const [isLoading, setIsLoading] = useState(true);

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
      setTemplates([]);
      setEvents([]);
      setParticipants({});
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
  }, [loadBootstrap, user]);

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

  return (
    <DataContext.Provider value={{
      templates, events, participants,
      isLoading,
      createTemplate, updateTemplate, deleteTemplate, duplicateTemplate,
      createEvent, updateEvent, deleteEvent, duplicateEvent,
      changeEventStatus, addRound,
      addParticipant, removeParticipant, updateParticipantRole, updateScore, getEventParticipants,
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
