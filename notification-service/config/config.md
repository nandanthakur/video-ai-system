# Notification Service Configuration

## Environment Variables

```
# Service
NOTIFICATION_SERVICE_PORT=9000

# Microsoft Teams Webhook
TEAMS_WEBHOOK_URL=https://outlook.office.com/webhook/your-webhook-url
```

## Teams Webhook Setup

1. Go to your Teams channel
2. Click "..." > "Connectors"
3. Find "Incoming Webhook"
4. Create a webhook and copy the URL
5. Set `TEAMS_WEBHOOK_URL` environment variable

## Alert Routing

Critical alerts → Teams (immediate)
Warning alerts → Teams (batched)
Resolved alerts → Teams (with "Resolved" status)

## Adaptive Card Format

The service converts Prometheus alerts to Microsoft Teams Adaptive Cards:

```json
{
  "type": "message",
  "version": "1.4",
  "body": [
    {
      "type": "Container",
      "style": "attention",
      "items": [
        {"type": "TextBlock", "text": "🚨 AlertName", "weight": "bolder"}
      ]
    },
    {"type": "FactSet", "facts": [...]}
  ],
  "actions": [
    {"type": "Action.OpenUrl", "title": "View in Grafana", "url": "..."}
  ]
}
```