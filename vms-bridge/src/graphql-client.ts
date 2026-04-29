export class GraphQLClient {
  private endpoint: string;
  private headers: Record<string, string>;

  constructor(endpoint: string) {
    this.endpoint = endpoint;
    this.headers = {
      "Content-Type": "application/json",
    };
  }

  setAuthToken(token: string): void {
    this.headers["Authorization"] = `Bearer ${token}`;
  }

  async query<T = unknown>(
    query: string,
    variables?: Record<string, unknown>
  ): Promise<T> {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ query, variables }),
    });

    const result = await response.json() as { errors?: Array<{ message: string }>; data: T };

    if (result.errors) {
      throw new Error(result.errors[0].message);
    }

    return result.data;
  }

  async mutate<T = unknown>(
    mutation: string,
    variables?: Record<string, unknown>
  ): Promise<T> {
    return this.query<T>(mutation, variables);
  }
}

export function gql(strings: TemplateStringsArray, ...args: string[]): string {
  let query = "";
  strings.forEach((string, i) => {
    query += string;
    if (args[i]) {
      query += args[i];
    }
  });
  return query;
}