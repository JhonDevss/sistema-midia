export type UserRole = 'admin' | 'staff';

export interface User {
  id: string;
  discordUsername: string;
  role: UserRole;
  mustChangePassword: boolean;
  active: boolean;
  createdAt: string;
}

export type EventType = 'solo' | 'grupo';
export type ColumnType = 'inteiro' | 'decimal' | 'texto';

export interface ScoreColumn {
  id: string;
  name: string;
  type: ColumnType;
  countsForRanking: boolean;
  rankingWeight: number;
}

export interface RoleMetric {
  id: string;
  name: string;
  weight: number;
}

/** A participant role/function with per-column weight overrides */
export interface EventRole {
  id: string;
  name: string;
  description: string;
  color: string;
  /** Role-specific metric definitions (name + weight). */
  roleMetrics: RoleMetric[];
  /** Legacy support for previously saved data. */
  columnWeights?: Record<string, number>;
}

export interface EventTemplate {
  id: string;
  name: string;
  eventType: EventType;
  description: string;
  internalNotes: string;
  scoreColumns: ScoreColumn[];
  roles: EventRole[];
  isDefault: boolean;
  createdAt: string;
}

export type EventStatus = 'rascunho' | 'em_andamento' | 'encerrado';

export interface GameEvent {
  id: string;
  title: string;
  templateId: string;
  templateName: string;
  eventType: EventType;
  status: EventStatus;
  scheduledDate?: string;
  discordChannel?: string;
  plannedRounds?: number;
  usedRounds: number;
  scoreColumns: ScoreColumn[];
  roles: EventRole[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Participant {
  id: string;
  eventId: string;
  name: string;
  discordId?: string;
  groupDescription?: string;
  roleId?: string;
  scores: Record<string, number | string>;
  roundScores?: Array<{
    roundNumber: number;
    roleId?: string;
    scores: Record<string, number | string>;
  }>;
  totalScore: number;
  position: number;
  createdAt: string;
}

export interface EventPresence {
  userId: string;
  username: string;
  color: string;
  isTyping: boolean;
  selection: {
    participantId: string;
    columnName: string;
  } | null;
  updatedAt: string;
}

export interface TopParticipantByDiscordId {
  discordId: string;
  participations: number;
}

export interface AuditLog {
  id: string;
  action: string;
  actorUserId: string;
  actorUsername: string;
  targetType: string;
  targetId?: string;
  details?: Record<string, unknown>;
  createdAt: string;
}

export const ROLE_COLORS = [
  '#EF4444', '#F97316', '#EAB308', '#22C55E', '#06B6D4',
  '#3B82F6', '#8B5CF6', '#EC4899', '#6B7280', '#14B8A6',
];
