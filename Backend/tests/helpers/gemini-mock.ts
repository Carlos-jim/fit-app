/**
 * Mocks for the Google Gemini client.
 *
 * The real client (`@google/genai`) instantiates its own HTTP layer, so
 * we mock the top-level class and let the service under test call
 * `models.generateContent` against a stub we control.
 */

export function makeGeminiMock(opts: {
  responses?: Array<{ text?: string; modelVersion?: string } | Error>;
} = {}) {
  const responses = opts.responses ?? [];
  let index = 0;
  const generateContent = jest.fn(async () => {
    const next = responses[index++];
    if (!next) {
      throw new Error("No more mock responses configured.");
    }
    if (next instanceof Error) throw next;
    return { text: next.text ?? "", modelVersion: next.modelVersion ?? "gemini-test" };
  });

  const ctor = jest.fn().mockImplementation(() => ({
    models: { generateContent },
  }));

  return { ctor, generateContent };
}