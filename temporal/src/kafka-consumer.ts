import { Kafka, Consumer, EachMessagePayload } from "kafkajs";
import { ProcessingRequest } from "./types";

export class KafkaConsumer {
  private kafka: Kafka;
  private consumer: Consumer;
  private topic: string;
  private messageHandler: ((request: ProcessingRequest) => Promise<void>) | null = null;

  constructor(brokers: string[], groupId: string, topic: string) {
    this.kafka = Kafka({ brokers });
    this.consumer = this.kafka.consumer({ groupId });
    this.topic = topic;
  }

  async connect(): Promise<void> {
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: this.topic, fromBeginning: false });
  }

  async disconnect(): Promise<void> {
    await this.consumer.disconnect();
  }

  async start(handler: (request: ProcessingRequest) => Promise<void>): Promise<void> {
    this.messageHandler = handler;

    await this.consumer.run({
      eachMessage: async ({ message }: EachMessagePayload) => {
        if (!message.value) return;

        try {
          const request: ProcessingRequest = JSON.parse(message.value.toString());
          await this.messageHandler!(request);
        } catch (error) {
          console.error("Error processing message:", error);
        }
      },
    });
  }

  async pause(): Promise<void> {
    await this.consumer.pause();
  }

  async resume(): Promise<void> {
    await this.consumer.resume();
  }
}