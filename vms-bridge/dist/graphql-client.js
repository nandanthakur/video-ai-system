"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphQLClient = void 0;
exports.gql = gql;
class GraphQLClient {
    constructor(endpoint) {
        this.endpoint = endpoint;
        this.headers = {
            "Content-Type": "application/json",
        };
    }
    setAuthToken(token) {
        this.headers["Authorization"] = `Bearer ${token}`;
    }
    async query(query, variables) {
        const response = await fetch(this.endpoint, {
            method: "POST",
            headers: this.headers,
            body: JSON.stringify({ query, variables }),
        });
        const result = await response.json();
        if (result.errors) {
            throw new Error(result.errors[0].message);
        }
        return result.data;
    }
    async mutate(mutation, variables) {
        return this.query(mutation, variables);
    }
}
exports.GraphQLClient = GraphQLClient;
function gql(strings, ...args) {
    let query = "";
    strings.forEach((string, i) => {
        query += string;
        if (args[i]) {
            query += args[i];
        }
    });
    return query;
}
//# sourceMappingURL=graphql-client.js.map