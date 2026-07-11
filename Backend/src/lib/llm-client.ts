import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";

import { env } from "../config/env.js";

export interface LLMMessageContentPart {
  type: "text" | "image_url";
  text?: string;
  image_url?: { url: string };
}

export type LLMMessageRole = "system" | "user" | "assistant";

export interface LLMMessage {
  role: LLMMessageRole;
  content: string | LLMMessageContentPart[];
}

export interface LLMRequest {
  model: string;
  messages: LLMMessage[];
  jsonMode?: boolean;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMResponse {
  text: string;
  model: string;
}

export interface LLMClient {
  generate(req: LLMRequest): Promise<LLMResponse>;
}

class OllamaClient implements LLMClient {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: "ollama",
      baseURL: env.OLLAMA_BASE_URL,
      timeout: 120_000,
    });
  }

  async generate(req: LLMRequest): Promise<LLMResponse> {
    const messages = req.messages.map<OpenAI.Chat.ChatCompletionMessageParam>((m) => {
      if (m.role === "system") {
        return { role: "system", content: this.toText(m.content) };
      }
      if (m.role === "assistant") {
        return { role: "assistant", content: this.toText(m.content) };
      }
      return {
        role: "user",
        content:
          typeof m.content === "string"
            ? m.content
            : m.content.map<OpenAI.Chat.ChatCompletionContentPart>((p) => {
                if (p.type === "image_url" && p.image_url?.url) {
                  return { type: "image_url", image_url: { url: p.image_url.url } };
                }
                return { type: "text", text: p.text ?? "" };
              }),
      };
    });

    const completion = await this.client.chat.completions.create({
      model: req.model,
      messages,
      ...(req.jsonMode
        ? { response_format: { type: "json_object" as const } }
        : {}),
      ...(req.temperature !== undefined ? { temperature: req.temperature } : {}),
      ...(req.maxTokens !== undefined ? { max_tokens: req.maxTokens } : {}),
    });

    const text = completion.choices[0]?.message?.content?.trim() ?? "";
    const model = completion.model ?? req.model;

    if (!text) {
      throw new Error("Ollama returned an empty response.");
    }

    return { text, model };
  }

  private toText(content: string | LLMMessageContentPart[]): string {
    if (typeof content === "string") return content;
    return content
      .filter((p) => p.type === "text" && p.text)
      .map((p) => p.text!)
      .join("\n");
  }
}

class GeminiClient implements LLMClient {
  private client: GoogleGenAI;

  constructor() {
    if (!env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is required when LLM_PROVIDER=gemini");
    }
    this.client = new GoogleGenAI({
      apiKey: env.GEMINI_API_KEY,
      httpOptions: { timeout: 45_000 },
    });
  }

  async generate(req: LLMRequest): Promise<LLMResponse> {
    const systemMessage = req.messages.find((m) => m.role === "system");
    const userMessages = req.messages.filter((m) => m.role !== "system");

    const contents = userMessages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: this.toGeminiParts(m.content),
    }));

    const response = await this.client.models.generateContent({
      model: req.model,
      contents,
      config: {
        ...(systemMessage
          ? { systemInstruction: this.toGeminiText(systemMessage.content) }
          : {}),
        ...(req.jsonMode
          ? { responseMimeType: "application/json" }
          : {}),
        ...(req.temperature !== undefined ? { temperature: req.temperature } : {}),
        ...(req.maxTokens !== undefined ? { maxOutputTokens: req.maxTokens } : {}),
      },
    });

    const text = response.text?.trim() ?? "";
    const model = response.modelVersion ?? req.model;

    if (!text) {
      throw new Error("Gemini returned an empty response.");
    }

    return { text, model };
  }

  private toGeminiText(
    content: string | LLMMessageContentPart[],
  ): string {
    if (typeof content === "string") return content;
    return content
      .filter((p) => p.type === "text" && p.text)
      .map((p) => p.text!)
      .join("\n");
  }

  private toGeminiParts(
    content: string | LLMMessageContentPart[],
  ): Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> {
    if (typeof content === "string") {
      return [{ text: content }];
    }
    const parts: Array<
      { text: string } | { inlineData: { mimeType: string; data: string } }
    > = [];
    for (const part of content) {
      if (part.type === "text" && part.text) {
        parts.push({ text: part.text });
      } else if (part.type === "image_url" && part.image_url?.url) {
        const { mimeType, data } = this.parseDataUrl(part.image_url.url);
        parts.push({ inlineData: { mimeType, data } });
      }
    }
    return parts;
  }

  private parseDataUrl(dataUrl: string): { mimeType: string; data: string } {
    const match =
      /^data:(?<mimeType>[-\w.+/]+);base64,(?<data>[A-Za-z0-9+/=]+)$/u.exec(
        dataUrl,
      );
    if (!match?.groups?.mimeType || !match.groups.data) {
      throw new Error("Invalid image data URL");
    }
    return { mimeType: match.groups.mimeType, data: match.groups.data };
  }
}

export function createLLMClient(): LLMClient {
  return env.LLM_PROVIDER === "gemini"
    ? new GeminiClient()
    : new OllamaClient();
}

export const llmClient: LLMClient = createLLMClient();

export function getCandidateModels(): string[] {
  if (env.LLM_PROVIDER === "gemini") {
    return Array.from(
      new Set([
        env.GEMINI_MODEL,
        "gemini-2.5-flash",
        "gemini-2.5-flash-lite",
      ]),
    );
  }
  return Array.from(
    new Set([
      env.OLLAMA_MODEL,
      env.OLLAMA_FALLBACK_MODEL ?? env.OLLAMA_MODEL,
    ]),
  );
}