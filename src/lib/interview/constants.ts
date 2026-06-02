export const AZURE_VOICES_EN = [
  { name: "en-US-AvaMultilingualNeural", label: "Ava (US, multilingual)" },
  { name: "en-US-AndrewMultilingualNeural", label: "Andrew (US, multilingual)" },
  { name: "en-US-EmmaMultilingualNeural", label: "Emma (US, multilingual)" },
  { name: "en-US-BrianMultilingualNeural", label: "Brian (US, multilingual)" },
  { name: "en-GB-SoniaNeural", label: "Sonia (UK)" },
  { name: "en-GB-RyanNeural", label: "Ryan (UK)" },
] as const;

export const AZURE_VOICES_VN = [
  { name: "vi-VN-HoaiMyNeural", label: "Hoài My (VN, female)" },
  { name: "vi-VN-NamMinhNeural", label: "Nam Minh (VN, male)" },
] as const;

export const DEFAULT_VOICE_EN = "en-US-AvaMultilingualNeural";
export const DEFAULT_VOICE_VN = "vi-VN-HoaiMyNeural";

export const AI_PROVIDERS = [
  { value: "gemini", label: "Google Gemini 2.0 Flash" },
  { value: "openai", label: "OpenAI GPT-4o-mini" },
] as const;
