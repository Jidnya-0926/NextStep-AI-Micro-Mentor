
export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  type: 'text' | 'roadmap' | 'courses' | 'json' | 'handoff';
  data?: any; // For structured content like roadmaps or courses
  groundingMetadata?: GroundingMetadata; // For Google Search Sources
  timestamp: number;
}

export interface ChatSession {
  id: string;
  title: string;
  preview: string;
  updatedAt: number;
}

export interface WeekPlan {
  week: string;
  title: string;
  description: string;
}

export interface RoadmapData {
  weeks: WeekPlan[];
  projects: string[];
}

export interface Course {
  platform: string;
  courseName: string;
  level: string;
  link: string;
}

export interface CourseData {
  courses: Course[];
}

export interface AgentHandoff {
  targetAgentId: string;
  targetAgentName: string;
  reason: string;
  context: string;
  suggestedPrompt: string;
}

export interface AgentHandoffData {
  handoff: AgentHandoff;
}

export interface AgentType {
  id: string;
  name: string;
  icon: string;
  description: string;
  systemInstruction: string;
}

// ADK / Search Grounding Types
export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}

export interface GroundingMetadata {
  groundingChunks?: GroundingChunk[];
  groundingSupports?: any[];
  webSearchQueries?: string[];
}