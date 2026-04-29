import express, { Request, Response } from "express";
import { AlertPayload, AdaptiveCard } from "./types";

const app = express();
app.use(express.json());

const TEAMS_WEBHOOK_URL = process.env.TEAMS_WEBHOOK_URL || "";

function getSeverityColor(severity: string): string {
  switch (severity) {
    case "critical":
      return "attention";
    case "warning":
      return "warning";
    default:
      return "accent";
  }
}

function createAdaptiveCard(payload: AlertPayload): AdaptiveCard {
  const criticalAlerts = payload.alerts.filter(
    (a) => a.labels.severity === "critical"
  );
  const warningAlerts = payload.alerts.filter(
    (a) => a.labels.severity === "warning"
  );

  const hasCritical = criticalAlerts.length > 0;
  const primaryColor = hasCritical ? "attention" : "warning";

  const facts = payload.alerts.slice(0, 5).map((alert) => ({
    title: alert.labels.alertname || "Alert",
    value:
      alert.annotations.summary ||
      alert.annotations.description ||
      "No description",
  }));

  const body: AdaptiveCard["body"] = [
    {
      type: "Container",
      style: primaryColor,
      items: [
        {
          type: "TextBlock",
          text: `🚨 ${payload.groupLabels.alertname || "Alert"}`,
          weight: "bolder",
          size: "large",
          color: primaryColor,
        },
        {
          type: "TextBlock",
          text: `Status: ${payload.status.toUpperCase()}`,
          wrap: true,
        },
      ],
    },
    {
      type: "FactSet",
      facts: [
        { title: "Cluster", value: payload.groupLabels.cluster || "N/A" },
        { title: "Environment", value: payload.commonLabels.environment || "N/A" },
        { title: "Alerts", value: String(payload.alerts.length) },
      ],
    },
  ];

  if (facts.length > 0) {
    body.push({
      type: "FactSet",
      facts: facts,
    });
  }

  if (payload.alerts.some((a) => a.annotations.description)) {
    const descriptions = payload.alerts
      .filter((a) => a.annotations.description)
      .slice(0, 3)
      .map((a) => a.annotations.description);

    if (descriptions.length > 0) {
      body.push({
        type: "TextBlock",
        text: `📋 Details:\n${descriptions.join("\n\n")}`,
        wrap: true,
        size: "small",
      });
    }
  }

  return {
    type: "message",
    version: "1.4",
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    body,
    actions: [
      {
        type: "Action.OpenUrl",
        title: "View in Grafana",
        url: payload.externalURL || "http://localhost:3000",
      },
    ],
  };
}

async function sendToTeams(webhookUrl: string, card: AdaptiveCard): Promise<void> {
  if (!webhookUrl) {
    console.warn("Teams webhook URL not configured");
    return;
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(card),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send to Teams: ${error}`);
  }
}

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/webhook/teams", async (req: Request, res: Response) => {
  try {
    const payload = req.body as AlertPayload;

    if (!payload.alerts || payload.alerts.length === 0) {
      res.status(200).json({ message: "No alerts to process" });
      return;
    }

    const card = createAdaptiveCard(payload);

    const webhookUrl = TEAMS_WEBHOOK_URL || req.body.webhookUrl;
    await sendToTeams(webhookUrl, card);

    console.log("Alert sent to Teams:", {
      alertname: payload.groupLabels.alertname,
      count: payload.alerts.length,
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error processing alert:", error);
    res.status(500).json({ error: String(error) });
  }
});

app.post("/webhook/test", async (_req, res) => {
  const testPayload: AlertPayload = {
    receiver: "test",
    status: "firing",
    alerts: [
      {
        status: "firing",
        labels: { alertname: "TestAlert", severity: "critical" },
        annotations: {
          summary: "Test Alert",
          description: "This is a test alert from the notification service",
        },
        startsAt: new Date().toISOString(),
        endsAt: "",
        fingerprint: "test-123",
      },
    ],
    groupLabels: { alertname: "TestAlert" },
    commonLabels: { alertname: "TestAlert", severity: "critical" },
    commonAnnotations: {
      summary: "Test Alert",
      description: "This is a test alert",
    },
    externalURL: "http://localhost:3000",
  };

  const card = createAdaptiveCard(testPayload);
  res.json(card);
});

const PORT = parseInt(process.env.NOTIFICATION_SERVICE_PORT || "9000");
app.listen(PORT, () => {
  console.log(`Notification service listening on port ${PORT}`);
});