export interface TeamsConfig {
  webhookUrl: string;
  colorTheme: {
    critical: string;
    warning: string;
    info: string;
  };
}

export interface AlertPayload {
  receiver: string;
  status: string;
  alerts: Alert[];
  groupLabels: Record<string, string>;
  commonLabels: Record<string, string>;
  commonAnnotations: Record<string, string>;
  externalURL: string;
}

export interface Alert {
  status: string;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  startsAt: string;
  endsAt: string;
  fingerprint: string;
}

export interface AdaptiveCard {
  type: string;
  version: string;
  body: AdaptiveCardElement[];
  actions?: AdaptiveCardAction[];
  $schema: string;
}

export interface AdaptiveCardElement {
  type: string;
  text?: string;
  size?: string;
  weight?: string;
  color?: string;
  items?: AdaptiveCardElement[];
  columns?: AdaptiveColumn[];
  facts?: { title: string; value: string }[];
  wrap?: boolean;
}

export interface AdaptiveColumn {
  type: string;
  width: string;
  items: AdaptiveCardElement[];
}

export interface AdaptiveCardAction {
  type: string;
  title: string;
  url: string;
}