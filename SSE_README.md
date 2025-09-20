# Daytona MCP Server - Server-Sent Events (SSE) Documentation

This document explains how to use the Server-Sent Events (SSE) functionality added to the Daytona MCP server.

## Overview

The SSE endpoint allows real-time streaming of sandbox events, including:
- **Sandbox Status Updates**: Real-time status monitoring every 5 seconds
- **Sessions Updates**: Active sessions monitoring every 10 seconds  
- **Command Logs**: Live streaming of command execution logs

## Endpoints

### SSE Endpoint
```
GET /sse?{parameters}
```

### MCP Tool
```
getSSEConnectionUrl
```

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `sandboxId` | Yes | ID of the sandbox to monitor |
| `eventType` | No | Type of events to stream (`logs`, `sandbox-status`, `sessions`) |
| `sessionId` | Yes* | Session ID (required for `logs` event type) |
| `commandId` | Yes* | Command ID (required for `logs` event type) |

*Required only when `eventType=logs`

## Event Types

### 1. Sandbox Status (`sandbox-status`)
Streams sandbox status updates every 5 seconds.

**Example URL:**
```
GET /sse?sandboxId=your-sandbox-id&eventType=sandbox-status
```

**Events:**
- `sandbox-status`: Contains current sandbox information
- `error`: Error events

### 2. Sessions (`sessions`)
Streams active sessions updates every 10 seconds.

**Example URL:**
```
GET /sse?sandboxId=your-sandbox-id&eventType=sessions
```

**Events:**
- `sessions-update`: Contains current active sessions
- `error`: Error events

### 3. Command Logs (`logs`)
Streams real-time command execution logs.

**Example URL:**
```
GET /sse?sandboxId=your-sandbox-id&eventType=logs&sessionId=your-session-id&commandId=your-command-id
```

**Events:**
- `log`: Individual log entries
- `log-complete`: Log stream ended
- `log-error`: Log stream error
- `error`: General error events

## Usage Examples

### JavaScript/TypeScript

```javascript
// Connect to sandbox status updates
const eventSource = new EventSource('/sse?sandboxId=your-sandbox-id&eventType=sandbox-status');

eventSource.onopen = function(event) {
    console.log('Connected to SSE stream');
};

eventSource.addEventListener('sandbox-status', function(event) {
    const data = JSON.parse(event.data);
    console.log('Sandbox status:', data);
});

eventSource.addEventListener('error', function(event) {
    console.error('SSE error:', event);
});

// Don't forget to close the connection
eventSource.close();
```

### Python

```python
import requests
import json

def stream_events(sandbox_id, event_type='sandbox-status'):
    url = f'/sse?sandboxId={sandbox_id}&eventType={event_type}'
    
    with requests.get(url, stream=True) as response:
        for line in response.iter_lines():
            if line:
                # Parse SSE format
                if line.startswith(b'data: '):
                    data = json.loads(line[6:])
                    print(f"Event: {data}")
```

### cURL

```bash
# Stream sandbox status
curl -N -H "Accept: text/event-stream" \
  "https://daytona-mcp-server-main.vercel.app/sse?sandboxId=your-sandbox-id&eventType=sandbox-status"

# Stream command logs
curl -N -H "Accept: text/event-stream" \
  "https://daytona-mcp-server-main.vercel.app/sse?sandboxId=your-sandbox-id&eventType=logs&sessionId=your-session-id&commandId=your-command-id"
```

## Event Format

All events follow the Server-Sent Events specification:

```
event: event-name
data: {"key": "value", "timestamp": "2024-01-01T00:00:00.000Z"}

```

### Event Types

- `connected`: Initial connection confirmation
- `disconnected`: Client disconnected
- `sandbox-status`: Sandbox status update
- `sessions-update`: Sessions list update
- `log`: Command log entry
- `log-complete`: Log stream completed
- `log-error`: Log stream error
- `error`: General error

## Demo Page

A demo page is available at `/sse-demo.html` that provides a web interface to test the SSE functionality.

## MCP Integration

Use the `getSSEConnectionUrl` tool in your MCP client to get the appropriate SSE URL:

```json
{
  "tool": "getSSEConnectionUrl",
  "arguments": {
    "sandboxId": "your-sandbox-id",
    "eventType": "sandbox-status"
  }
}
```

## Error Handling

The SSE endpoint includes comprehensive error handling:

- **Connection errors**: Automatically retry with exponential backoff
- **API errors**: Graceful error messages with context
- **Invalid parameters**: Clear error messages for missing required parameters
- **Client disconnect**: Proper cleanup of resources

## CORS Support

The SSE endpoint includes CORS headers for cross-origin requests:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

## Rate Limiting

- **Sandbox Status**: Updates every 5 seconds
- **Sessions**: Updates every 10 seconds
- **Logs**: Real-time streaming (no artificial delays)

## Security

- Uses the same authentication as the main MCP server
- Validates all input parameters
- Proper error handling to prevent information leakage
- CORS configured for secure cross-origin requests

## Troubleshooting

### Common Issues

1. **Connection fails immediately**
   - Check if sandbox ID is valid
   - Verify authentication token
   - Ensure required parameters are provided

2. **No events received**
   - Check if sandbox is running
   - Verify event type is correct
   - Check browser console for errors

3. **Logs not streaming**
   - Ensure sessionId and commandId are provided
   - Verify command is still running
   - Check if command has logs available

### Debug Mode

Enable debug logging by checking the browser console or server logs for detailed error information.
