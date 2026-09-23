export class UserFacingError extends Error {
  readonly staffMessage: string;
  readonly diagnostic?: string;

  constructor(staffMessage: string, diagnostic?: string) {
    super(staffMessage);
    this.name = "UserFacingError";
    this.staffMessage = staffMessage;
    this.diagnostic = diagnostic;
  }
}

export function toStaffMessage(error: unknown): string {
  if (error instanceof UserFacingError) return error.staffMessage;
  if (error instanceof Error && !/SQLITE|ECONN|Promise|Internal Server/i.test(error.message)) {
    return error.message;
  }
  return "Something went wrong. Your data has been saved locally. We will try again automatically.";
}
