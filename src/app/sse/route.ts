import { NextRequest } from "next/server";
import axios from "axios";

// Daytona API client
const daytonaClient = axios.create({
  baseURL: process.env.DAYTONA_API_URL || "https://app.daytona.io/api",
  headers: {
    "Authorization": `Bearer dtn_45bfb171c1f3023217f9547fb4dffda18b5fd36083498d66393d175084ad6153`,
    "Content-Type": "application/json",
  },
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sandboxId = searchParams.get('sandboxId');
  const sessionId = searchParams.get('sessionId');
  const commandId = searchParams.get('commandId');
  const eventType = searchParams.get('eventType') || 'sandbox-status';

  if (!sandboxId) {
    return new Response('Missing sandboxId parameter', { status: 400 });
  }

  // Set up SSE headers
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      
      // Send initial connection event
      const sendEvent = (event: string, data: any) => {
        const eventData = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(eventData));
      };

      sendEvent('connected', { 
        message: 'SSE connection established',
        sandboxId,
        sessionId,
        commandId,
        eventType
      });

      // Handle different event types
      let cleanupFunction: (() => void) | undefined;
      
      const handleEventStream = async () => {
        try {
          switch (eventType) {
            case 'logs':
              if (sessionId && commandId) {
                await streamCommandLogs(sandboxId, sessionId, commandId, sendEvent);
              } else {
                sendEvent('error', { message: 'sessionId and commandId required for logs streaming' });
              }
              break;
            case 'sandbox-status':
              cleanupFunction = await streamSandboxStatus(sandboxId, sendEvent);
              break;
            case 'sessions':
              cleanupFunction = await streamSessions(sandboxId, sendEvent);
              break;
            default:
              sendEvent('error', { message: `Unknown event type: ${eventType}` });
          }
        } catch (error) {
          console.error('SSE stream error:', error);
          sendEvent('error', { 
            message: 'Stream error', 
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      };

      // Start the event stream
      handleEventStream();

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        if (cleanupFunction) {
          cleanupFunction();
        }
        sendEvent('disconnected', { message: 'Client disconnected' });
        controller.close();
      });
    }
  });

  return new Response(stream, { headers });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

// Stream command logs
async function streamCommandLogs(sandboxId: string, sessionId: string, commandId: string, sendEvent: Function) {
  try {
    const response = await daytonaClient.get(
      `/toolbox/${sandboxId}/toolbox/process/session/${sessionId}/command/${commandId}/logs`,
      { 
        params: { follow: true },
        responseType: 'stream'
      }
    );

    response.data.on('data', (chunk: Buffer) => {
      const logData = chunk.toString();
      sendEvent('log', { 
        sandboxId, 
        sessionId, 
        commandId, 
        data: logData,
        timestamp: new Date().toISOString()
      });
    });

    response.data.on('end', () => {
      sendEvent('log-complete', { 
        sandboxId, 
        sessionId, 
        commandId,
        message: 'Log stream ended'
      });
    });

    response.data.on('error', (error: Error) => {
      sendEvent('log-error', { 
        sandboxId, 
        sessionId, 
        commandId, 
        error: error.message
      });
    });

  } catch (error) {
    sendEvent('error', { 
      message: 'Failed to stream command logs',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Stream sandbox status updates
async function streamSandboxStatus(sandboxId: string, sendEvent: Function) {
  const pollInterval = 5000; // 5 seconds
  
  const pollStatus = async () => {
    try {
      const response = await daytonaClient.get(`/sandbox/${sandboxId}`);
      sendEvent('sandbox-status', {
        sandboxId,
        status: response.data,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      sendEvent('error', {
        message: 'Failed to get sandbox status',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // Initial status
  await pollStatus();

  // Poll for updates
  const interval = setInterval(pollStatus, pollInterval);

  // Clean up interval when stream ends
  return () => clearInterval(interval);
}

// Stream sessions updates
async function streamSessions(sandboxId: string, sendEvent: Function) {
  const pollInterval = 10000; // 10 seconds
  
  const pollSessions = async () => {
    try {
      const response = await daytonaClient.get(`/toolbox/${sandboxId}/toolbox/process/session`);
      sendEvent('sessions-update', {
        sandboxId,
        sessions: response.data,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      sendEvent('error', {
        message: 'Failed to get sessions',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // Initial sessions
  await pollSessions();

  // Poll for updates
  const interval = setInterval(pollSessions, pollInterval);

  // Clean up interval when stream ends
  return () => clearInterval(interval);
}
