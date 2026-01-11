
import { GoogleGenAI, Type } from "@google/genai";
import { LectureSummary, LectureFile } from "../types";

/**
 * Creates a fallback summary when AI processing fails
 */
const createFallbackSummary = (transcript: string): LectureSummary => ({
  overview: "AI summarization was unavailable. Please review the transcript below.",
  keyPoints: ["Transcript captured successfully - manual review recommended"],
  vocabulary: [],
  actionItems: ["Review the full transcript for key information"],
  transcriptOnly: true
});

/**
 * Transcribes audio using Gemini 3 Flash with fallback handling.
 */
export const transcribeAudio = async (base64Audio: string, mimeType: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Audio,
            },
          },
          { text: "Please transcribe this lecture." },
        ],
      },
      config: {
        systemInstruction: "You are a professional academic transcriber. Transcribe the audio exactly as spoken. Do not include preamble. Just provide the text.",
      }
    });

    return response.text || "No transcript generated.";
  } catch (error: any) {
    console.error("Transcription error:", error);
    // Check for CORS or network errors
    if (error.message?.includes('CORS') || error.message?.includes('Failed to fetch') || error.name === 'TypeError') {
      throw new Error("Network error: Unable to reach the AI service. The recording has been saved and you can try again later.");
    }
    throw new Error(error.message || "Transcription failed. Please try again.");
  }
};

/**
 * Summarizes the transcript with additional visual/document context using Gemini 3 Flash.
 * Falls back to transcript-only mode if summarization fails.
 */
export const summarizeTranscript = async (
  transcript: string,
  supplementaryFiles: LectureFile[]
): Promise<LectureSummary> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // Prepare multimodal parts
    const parts: any[] = [
      { text: `Transcript of the lecture: ${transcript}` }
    ];

    // Add supplementary files (images or PDFs) as context
    supplementaryFiles.forEach(file => {
      parts.push({
        inlineData: {
          mimeType: file.mimeType,
          data: file.base64
        }
      });
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts },
      config: {
        systemInstruction: `You are an expert academic assistant. Analyze the provided lecture transcript and the attached visual/document context (slides, photos, or PDFs). 
        Use the visual context to verify spelling of technical terms, understand diagrams mentioned in audio, and create a comprehensive structured summary.
        Output ONLY a valid JSON object matching the requested schema.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overview: {
              type: Type.STRING,
              description: "A high-level summary integrating audio and visual insights.",
            },
            keyPoints: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Main concepts, including details found in the slides/PDFs.",
            },
            vocabulary: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  term: { type: Type.STRING },
                  definition: { type: Type.STRING },
                },
                required: ["term", "definition"],
              },
              description: "Academic terms. Use visual context to ensure correct technical spelling.",
            },
            actionItems: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Assignments, reading, or dates mentioned in audio or seen in slides.",
            },
          },
          required: ["overview", "keyPoints", "vocabulary", "actionItems"],
        },
      },
    });

    const jsonStr = response.text?.trim() || "{}";
    try {
      return JSON.parse(jsonStr) as LectureSummary;
    } catch (e) {
      console.error("Failed to parse JSON response:", jsonStr);
      // Return fallback instead of throwing
      console.warn("Returning fallback summary due to parse error");
      return createFallbackSummary(transcript);
    }
  } catch (error: any) {
    console.error("Summarization error:", error);
    // Return fallback summary instead of failing completely
    console.warn("Summarization failed, using fallback mode");
    return createFallbackSummary(transcript);
  }
};
