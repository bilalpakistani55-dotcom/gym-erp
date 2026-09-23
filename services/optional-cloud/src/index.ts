export interface CloudConfig {
  enabled: boolean;
  baseUrl: string | null;
}

export function resolveCloudConfig(env: NodeJS.Dict<string> = process.env): CloudConfig {
  const baseUrl = env.GYM_ERP_CLOUD_URL?.trim() || null;
  return { enabled: Boolean(baseUrl), baseUrl };
}

export interface AiProvider {
  summarize(prompt: string): Promise<string>;
}

export class DisabledAiProvider implements AiProvider {
  async summarize(): Promise<string> {
    throw new Error("Optional AI is turned off. GYM ERP continues to work without it.");
  }
}
