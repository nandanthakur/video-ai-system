export declare class GraphQLClient {
    private endpoint;
    private headers;
    constructor(endpoint: string);
    setAuthToken(token: string): void;
    query<T = unknown>(query: string, variables?: Record<string, unknown>): Promise<T>;
    mutate<T = unknown>(mutation: string, variables?: Record<string, unknown>): Promise<T>;
}
export declare function gql(strings: TemplateStringsArray, ...args: string[]): string;
//# sourceMappingURL=graphql-client.d.ts.map