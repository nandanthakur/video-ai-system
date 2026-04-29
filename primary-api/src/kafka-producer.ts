import { Kafka, Producer, ProducerRecord } from "kafkajs";

export interface ProcessingRequest {
  workflowId: string;
  cameraId: string;
  videoUrl: string;
  cameraType: "normal" | "thermal";
  detectionConfigs: Array<{
    detectionType: string;
    enabled: boolean;
  }>;
}

export class KafkaProducer {
  private kafka: Kafka;
  private producer: Producer;
  private topicPrefix: string;

  constructor(brokers: string[], topicPrefix: string) {
    this.kafka = Kafka({ brokers });
    this.producer = this.kafka.producer();
    this.topicPrefix = topicPrefix;
  }

  async connect(): Promise<void> {
    await this.producer.connect();
  }

  async disconnect(): Promise<void> {
    await this.producer.disconnect();
  }

  async sendProcessingRequest(request: ProcessingRequest): Promise<void> {
    const topic = `${this.topicPrefix}-processing`;
    const processingTypes = request.detectionConfigs
      .filter((d) => d.enabled)
      .map((d) => d.detectionType);

    const record: ProducerRecord = {
      topic,
      messages: [
        {
          key: request.workflowId,
          value: JSON.stringify({
            workflowId: request.workflowId,
            cameraId: request.cameraId,
            videoUrl: request.videoUrl,
            cameraType: request.cameraType,
            detectionTypes: processingTypes,
            timestamp: new Date().toISOString(),
          }),
        },
      ],
    };

    await this.producer.send(record);
  }

  async sendToTopic(
    topic: string,
    key: string,
    value: unknown
  ): Promise<void> {
    const record: ProducerRecord = {
      topic,
      messages: [
        {
          key,
          value: JSON.stringify(value),
        },
      ],
    };

    await this.producer.send(record);
  }
}