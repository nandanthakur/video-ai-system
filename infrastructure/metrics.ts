import express, { Request, Response, NextFunction } from "express";

export interface MetricsMiddlewareOptions {
  prefix?: string;
}

interface MetricCounter {
  labels: Record<string, string>;
  value: number;
}

interface MetricHistogram {
  labels: Record<string, string>;
  buckets: Record<string, number>;
  sum: number;
  count: number;
}

class PrometheusMetrics {
  private counters: Map<string, MetricCounter> = new Map();
  private histograms: Map<string, MetricHistogram> = new Map();
  private prefix: string;

  constructor(prefix = "video_ai") {
    this.prefix = prefix;
  }

  counter(name: string, labels: Record<string, string> = {}) {
    const key = `${name}:${JSON.stringify(labels)}`;
    if (!this.counters.has(key)) {
      this.counters.set(key, { labels, value: 0 });
    }
    this.counters.get(key)!.value++;
  }

  histogram(name: string, value: number, labels: Record<string, string> = {}) {
    const key = `${name}:${JSON.stringify(labels)}`;
    if (!this.histograms.has(key)) {
      this.histograms.set(key, { labels, buckets: {}, sum: 0, count: 0 });
    }
    const hist = this.histograms.get(key)!;
    hist.count++;
    hist.sum += value;
  }

  inc(name: string, labels: Record<string, string> = {}) {
    this.counter(name, labels);
  }

  observe(name: string, value: number, labels: Record<string, string> = {}) {
    this.histogram(name, value, labels);
  }

  getMetrics(): string {
    const lines: string[] = [];

    for (const [key, counter] of this.counters) {
      const name = key.split(":")[0];
      const labelStr = Object.entries(counter.labels)
        .map(([k, v]) => `${k}="${v}"`)
        .join(",");
      lines.push(`# TYPE ${this.prefix}_${name} counter`);
      lines.push(`${this.prefix}_${name}{${labelStr}} ${counter.value}`);
    }

    for (const [key, hist] of this.histograms) {
      const name = key.split(":")[0];
      const labelStr = Object.entries(hist.labels)
        .map(([k, v]) => `${k}="${v}"`)
        .join(",");
      lines.push(`# TYPE ${this.prefix}_${name} histogram`);
      lines.push(`${this.prefix}_name{${labelStr}} ${hist.sum} ${hist.count}`);
    }

    return lines.join("\n");
  }
}

const metrics = new PrometheusMetrics();

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const labels = {
      method: req.method,
      path: req.route?.path || req.path,
      status: String(res.statusCode),
    };

    metrics.inc("http_requests_total", labels);
    metrics.observe("http_request_duration_seconds", duration / 1000, labels);
  });

  next();
}

export function getMetrics(): string {
  return metrics.getMetrics();
}

export function registerMetricsEndpoint(app: express.Express) {
  app.get("/metrics", (_req, res) => {
    res.set("Content-Type", "text/plain");
    res.send(getMetrics());
  });
}