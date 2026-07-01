import { NextResponse } from 'next/server';

export async function GET() {
  const openApiSpec = {
    openapi: "3.0.0",
    info: {
      title: "AkiliBrain API",
      description: "API for East Africa's Professional Intelligence Platform",
      version: "1.0.0",
    },
    servers: [
      {
        url: "https://akilibrain.vercel.app",
        description: "Production server"
      }
    ],
    paths: {
      "/api/chat": {
        post: {
          summary: "AI Intelligence Chat",
          description: "Send a natural language query to the AkiliBrain AI engine.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    query: {
                      type: "string",
                      description: "The user's query."
                    },
                    contextParams: {
                      type: "object",
                      description: "Optional contextual parameters."
                    }
                  },
                  required: ["query"]
                }
              }
            }
          },
          responses: {
            "200": {
              description: "Successful response",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      response: {
                        type: "string"
                      },
                      confidence: {
                        type: "number"
                      },
                      sources: {
                        type: "array",
                        items: {
                          type: "string"
                        }
                      },
                      strategyUsed: {
                        type: "string"
                      }
                    }
                  }
                }
              }
            },
            "429": {
              description: "Too Many Requests - Rate limit exceeded"
            }
          }
        }
      }
    }
  };

  return NextResponse.json(openApiSpec);
}
