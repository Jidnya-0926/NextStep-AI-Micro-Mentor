import { GoogleGenAI, Chat, GenerateContentResponse, Content } from "@google/genai";
import { SYSTEM_INSTRUCTION_BASE } from '../constants';
import { Message } from '../types';

const apiKey = process.env.API_KEY ;

// Initialize the client
const ai = new GoogleGenAI({ apiKey });

// Helper to sanitize JSON from markdown code blocks
export const extractJson = (text: string): any | null => {
  if (!text) return null;
  
  // 1. Try finding ALL markdown JSON blocks and merge them
  // This allows an agent to output a Roadmap JSON AND a Handoff JSON in one response
  const regex = /```json\n([\s\S]*?)\n```/g;
  let match;
  let combinedObj = {};
  let found = false;

  while ((match = regex.exec(text)) !== null) {
    if (match[1]) {
      try {
        const obj = JSON.parse(match[1]);
        combinedObj = { ...combinedObj, ...obj };
        found = true;
      } catch (e) {
        console.warn("Failed to parse JSON segment", e);
      }
    }
  }

  if (found) {
    return combinedObj;
  }

  // 2. Fallback: Try finding raw JSON object in text (only if no code blocks found)
  try {
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start !== -1 && end !== -1 && end > start) {
          const jsonStr = text.substring(start, end + 1);
          return JSON.parse(jsonStr);
      }
  } catch (e) {
    // console.warn("Failed to parse raw JSON from text", e);
  }
  
  return null;
};

// Map internal Message type to Gemini Content type
const mapMessagesToHistory = (messages: Message[]): Content[] => {
  return messages
    .filter(m => m.type === 'text' || m.type === 'roadmap' || m.type === 'courses') // Only send text-based context/content
    .map(m => ({
      role: m.role,
      parts: [{ text: m.text }]
    }));
};

export const createChatSession = (historyMessages: Message[] = []): Chat => {
  const history = mapMessagesToHistory(historyMessages);
  
  return ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: SYSTEM_INSTRUCTION_BASE,
      temperature: 0.7,
      // ENABLE ADK FEATURE: GOOGLE SEARCH TOOL
      tools: [{ googleSearch: {} }], 
    },
    history: history
  });
};

export const sendMessage = async (chat: Chat, message: string): Promise<GenerateContentResponse> => {
  const maxRetries = 3;
  let delay = 2000; // Start with 2 seconds delay

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await chat.sendMessage({ message });
      return result;
    } catch (error: any) {
      // Robust error parsing
      // The error object structure can vary: { error: { code, message, status } } or just { message }
      const status = error?.status || error?.response?.status || error?.error?.code;
      const errorMessage = error?.message || error?.error?.message || JSON.stringify(error);
      const lowerMsg = errorMessage.toLowerCase();

      // Check for Quota limits (Daily limit reached) - FAIL FAST
      // 429 can be rate limit (slow down) or quota limit (stop).
      // RESOURCE_EXHAUSTED is definitely quota.
      const isQuota = 
        lowerMsg.includes('quota') || 
        lowerMsg.includes('resource_exhausted') || 
        (status === 429 && lowerMsg.includes('exhausted')) ||
        (error?.error?.status === 'RESOURCE_EXHAUSTED');
      
      if (isQuota) {
        console.warn("Gemini API Quota Exceeded:", errorMessage);
        throw new Error("QUOTA_EXCEEDED"); // Throw specific error code for App to catch
      }

      // Check for Rate Limit (Speed limit), Temporary Server Issues (500/503), or XHR/Network errors
      const isRetryable = 
        status === 429 || 
        status === 503 || 
        status === 500 ||
        status === 'UNKNOWN' ||
        lowerMsg.includes('429') ||
        lowerMsg.includes('overloaded') ||
        lowerMsg.includes('xhr error') ||
        lowerMsg.includes('500');

      if (isRetryable && attempt < maxRetries) {
        console.warn(`Gemini API busy or Network error. Retrying in ${delay}ms... (Attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
        continue;
      }
      
      console.error("Gemini API Request Failed:", error);
      throw error;
    }
  }
  
  throw new Error("Max retries exceeded");
};