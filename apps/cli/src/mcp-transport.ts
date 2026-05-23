import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";
import WebSocket from "ws";

export class WebSocketClientTransport implements Transport {
  private ws: WebSocket;

  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage) => void;

  constructor(ws: WebSocket) {
    this.ws = ws;
  }

  async start(): Promise<void> {
    this.ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString()) as any;
        // In our backend, we might wrap MCP messages in a custom envelope to multiplex
        // with other WebSocket events. If so, we check the type.
        if (msg.type === "mcp_request" || msg.jsonrpc === "2.0") {
          // If enveloped
          const mcpMessage = msg.payload ? msg.payload : msg;
          this.onmessage?.(mcpMessage as JSONRPCMessage);
        }
      } catch (err) {
        // Not JSON or parse error, ignore
      }
    });

    this.ws.on("close", () => {
      this.onclose?.();
    });

    this.ws.on("error", (error) => {
      this.onerror?.(error);
    });
  }

  async close(): Promise<void> {
    // Note: We don't necessarily want the transport closing to close the main WebSocket
    // unless the entire session is over. For now, we do nothing or emit close.
    this.onclose?.();
  }

  async send(message: JSONRPCMessage): Promise<void> {
    // Send back to the backend
    this.ws.send(
      JSON.stringify({
        type: "mcp_response",
        payload: message,
      })
    );
  }
}
