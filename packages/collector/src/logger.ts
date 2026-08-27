import type { FeedbackErrorCategory } from "./endpoint-contract";

export type IngestLogEvent =
  | {
      category: FeedbackErrorCategory;
      eventId: string | null;
      projectKey: string | null;
      type: "ingest_rejected";
    }
  | {
      feedbackId: string;
      projectKey: string;
      source: string;
      type: "ingest_accepted";
    }
  | {
      eventId: string;
      feedbackId: string;
      projectKey: string;
      type: "ingest_duplicate";
    };

export interface Logger {
  log(event: IngestLogEvent): void;
}

export const consoleLogger: Logger = {
  log: (event) => {
    console.log(JSON.stringify(event));
  },
};

export const silentLogger: Logger = {
  log: () => {},
};
