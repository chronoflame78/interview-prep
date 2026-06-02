import * as sdk from "microsoft-cognitiveservices-speech-sdk";

type Language = "en" | "vn";

function localeFor(lang: Language): string {
  return lang === "vn" ? "vi-VN" : "en-US";
}

function escapeSsml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function fetchToken(): Promise<{ token: string; region: string }> {
  const res = await fetch("/api/speech/token");
  if (!res.ok) {
    throw new Error(`Failed to get Azure speech token: ${res.status}`);
  }
  return res.json();
}

export class AzureSpeech {
  private token: string;
  private region: string;
  private tokenIssuedAt: number;
  private synthesizer: sdk.SpeechSynthesizer | null = null;
  private recognizer: sdk.SpeechRecognizer | null = null;
  private listeningPartial = "";
  private listeningFinal = "";

  private constructor(token: string, region: string) {
    this.token = token;
    this.region = region;
    this.tokenIssuedAt = Date.now();
  }

  static async create(): Promise<AzureSpeech> {
    const { token, region } = await fetchToken();
    return new AzureSpeech(token, region);
  }

  private async ensureFreshToken(): Promise<void> {
    const eightMinutes = 8 * 60 * 1000;
    if (Date.now() - this.tokenIssuedAt > eightMinutes) {
      const { token, region } = await fetchToken();
      this.token = token;
      this.region = region;
      this.tokenIssuedAt = Date.now();
    }
  }

  private buildSpeechConfig(language: Language): sdk.SpeechConfig {
    const cfg = sdk.SpeechConfig.fromAuthorizationToken(this.token, this.region);
    cfg.speechRecognitionLanguage = localeFor(language);
    return cfg;
  }

  async speak(
    text: string,
    voiceName: string,
    rate: number,
    language: Language
  ): Promise<void> {
    await this.ensureFreshToken();
    const cfg = this.buildSpeechConfig(language);
    cfg.speechSynthesisVoiceName = voiceName;
    const synthesizer = new sdk.SpeechSynthesizer(cfg);
    this.synthesizer = synthesizer;

    const ssml = `<speak version="1.0" xml:lang="${localeFor(language)}"><voice name="${voiceName}"><prosody rate="${rate.toFixed(2)}">${escapeSsml(text)}</prosody></voice></speak>`;

    await new Promise<void>((resolve, reject) => {
      synthesizer.speakSsmlAsync(
        ssml,
        (result) => {
          synthesizer.close();
          if (this.synthesizer === synthesizer) this.synthesizer = null;
          if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
            resolve();
          } else {
            reject(new Error(result.errorDetails || "TTS failed"));
          }
        },
        (err) => {
          synthesizer.close();
          if (this.synthesizer === synthesizer) this.synthesizer = null;
          reject(new Error(typeof err === "string" ? err : "TTS error"));
        }
      );
    });
  }

  stopSpeaking(): void {
    if (this.synthesizer) {
      try {
        this.synthesizer.close();
      } catch {
        /* ignore */
      }
      this.synthesizer = null;
    }
  }

  async startListening(
    language: Language,
    onPartial: (text: string) => void
  ): Promise<void> {
    await this.ensureFreshToken();
    const cfg = this.buildSpeechConfig(language);
    const audioCfg = sdk.AudioConfig.fromDefaultMicrophoneInput();
    const recognizer = new sdk.SpeechRecognizer(cfg, audioCfg);
    this.recognizer = recognizer;
    this.listeningPartial = "";
    this.listeningFinal = "";

    recognizer.recognizing = (_s, e) => {
      this.listeningPartial = e.result.text;
      const combined = (this.listeningFinal + " " + this.listeningPartial).trim();
      onPartial(combined);
    };

    recognizer.recognized = (_s, e) => {
      if (e.result.reason === sdk.ResultReason.RecognizedSpeech && e.result.text) {
        this.listeningFinal = (this.listeningFinal + " " + e.result.text).trim();
        this.listeningPartial = "";
        onPartial(this.listeningFinal);
      }
    };

    await new Promise<void>((resolve, reject) => {
      recognizer.startContinuousRecognitionAsync(resolve, (err) => {
        reject(new Error(String(err)));
      });
    });
  }

  async stopListening(): Promise<string> {
    const recognizer = this.recognizer;
    if (!recognizer) return "";

    await new Promise<void>((resolve) => {
      recognizer.stopContinuousRecognitionAsync(resolve, () => resolve());
    });

    try {
      recognizer.close();
    } catch {
      /* ignore */
    }
    this.recognizer = null;

    const final = (this.listeningFinal + " " + this.listeningPartial).trim();
    this.listeningFinal = "";
    this.listeningPartial = "";
    return final;
  }

  dispose(): void {
    this.stopSpeaking();
    if (this.recognizer) {
      try {
        this.recognizer.close();
      } catch {
        /* ignore */
      }
      this.recognizer = null;
    }
  }
}
