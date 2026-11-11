export interface StreakRequest {
  query?: Record<string, string | string[] | undefined>;
}

export interface StreakResponse {
  setHeader(name: string, value: string): void;
  status(code: number): {
    send(body: string): unknown;
  };
}

export function isAllowedStreakUser(value: unknown): boolean;
export default function handler(req: StreakRequest, res: StreakResponse): Promise<unknown>;
