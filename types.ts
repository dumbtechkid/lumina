export interface Attachment {
  file: File;
  previewUrl: string;
  base64: string;
  mimeType: string;
  type: 'image' | 'video' | 'audio' | 'document';
}

export enum Role {
  USER = 'user',
  MODEL = 'model'
}

export interface GroundingChunk {
  web?: { uri: string; title: string };
  maps?: { uri: string; title: string; placeAnswerSources?: any[] };
}

export interface Message {
  id: string;
  role: Role;
  text: string;
  attachments?: Attachment[];
  generatedImage?: string; // Base64 string
  groundingChunks?: GroundingChunk[];
  timestamp: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}

export interface AppConfig {
  modelPreference: 'fast' | 'balanced';
  capabilities: {
    search: boolean;
    maps: boolean;
  };
  imageGeneration: {
    enabled: boolean;
    model: 'flash' | 'pro';
    aspectRatio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
    size: '1K' | '2K' | '4K';
  };
}