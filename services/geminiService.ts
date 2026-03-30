import { GoogleGenAI, Modality } from "@google/genai";
import { Attachment, Message, Role, AppConfig } from "../types";
import { decodeAudioData, blobToBase64 } from "../utils/audioUtils";

const API_KEY = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey: API_KEY });

// Models
const MODEL_FAST = 'gemini-2.5-flash-lite';
const MODEL_BALANCED = 'gemini-2.5-flash';
const MODEL_TTS = 'gemini-2.5-flash-preview-tts';

// --- Transcription ---
export const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
  try {
    const base64Audio = await blobToBase64(audioBlob);
    const response = await ai.models.generateContent({
      model: MODEL_BALANCED,
      contents: {
        parts: [
          { inlineData: { mimeType: audioBlob.type, data: base64Audio } },
          { text: "Transcribe this audio exactly as spoken." }
        ]
      }
    });
    return response.text || "";
  } catch (error) {
    console.error("Transcription error", error);
    return "";
  }
};

// --- Main Chat Generator ---
export const generateChatResponseStream = async function* (
  history: Message[],
  currentMessage: string,
  attachments: Attachment[],
  config: AppConfig,
  location?: { latitude: number; longitude: number }
): AsyncGenerator<{ text: string; image?: string; video?: string; groundingChunks?: any[] }, void, unknown> {
  
  // --- Text-Only Chat Model Selection ---
  let modelName = MODEL_FAST;
  let chatConfig: any = {
     systemInstruction: "You are Lumina. Helpful, witty, and concise.",
  };

  if (config.modelPreference === 'balanced' || config.capabilities.search || config.capabilities.maps) {
    modelName = MODEL_BALANCED;
  } else {
    modelName = MODEL_FAST;
  }

  // 4. Grounding
  const tools: any[] = [];
  if (config.capabilities.search) tools.push({ googleSearch: {} });
  if (config.capabilities.maps) tools.push({ googleMaps: {} });
  
  if (tools.length > 0) {
    chatConfig.tools = tools;
    if (config.capabilities.maps && location) {
      chatConfig.toolConfig = {
        retrievalConfig: {
          latLng: { latitude: location.latitude, longitude: location.longitude }
        }
      };
    }
  }

  // 5. Construct Request
  const parts: any[] = [{ text: currentMessage }];
  attachments.forEach(att => {
    parts.push({ inlineData: { mimeType: att.mimeType, data: att.base64 } });
  });

  const formattedHistory = history.map(msg => ({
    role: msg.role === Role.USER ? 'user' : 'model',
    parts: [{ text: msg.text }]
  }));

  try {
    const stream = await ai.models.generateContentStream({
      model: modelName,
      contents: [...formattedHistory, { role: 'user', parts }],
      config: chatConfig
    });

    for await (const chunk of stream) {
      const text = chunk.text || '';
      const groundingChunks = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
      yield { text, groundingChunks };
    }
  } catch (error) {
    console.error("Chat error", error);
    const errMsg = (error as any)?.message || String(error);
    yield { text: `I encountered an error: ${errMsg}. Please check your network and API key then try again.` };
  }
};

// --- TTS ---
export const generateSpeech = async (text: string): Promise<AudioBuffer | null> => {
  if (!API_KEY || !text) return null;
  try {
    const response = await ai.models.generateContent({
      model: MODEL_TTS,
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
      },
    });
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
      return await decodeAudioData(base64Audio, audioContext);
    }
    return null;
  } catch (error) {
    return null;
  }
};