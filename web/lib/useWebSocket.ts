"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { getTabId } from "./tabId";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";
const WS_URL = API_URL.replace(/^http/, "ws");

type ConnectionState = "connecting" | "connected" | "disconnected" | "reconnecting";

interface UseWebSocketOptions {
  path: string; // e.g. "/ws/game/abc123?playerId=p1"
  onMessage: (data: any) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  enabled?: boolean;
  reconnect?: boolean;
  maxRetries?: number;
}

export function useWebSocket({
  path,
  onMessage,
  onConnect,
  onDisconnect,
  enabled = true,
  reconnect = true,
  maxRetries = 10,
}: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const retriesRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [state, setState] = useState<ConnectionState>("disconnected");

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setState("connecting");
    const separator = path.includes("?") ? "&" : "?";
    const ws = new WebSocket(`${WS_URL}${path}${separator}tabId=${getTabId()}`);

    ws.onopen = () => {
      setState("connected");
      retriesRef.current = 0;
      onConnect?.();
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch {
        console.warn("Failed to parse WebSocket message:", event.data);
      }
    };

    ws.onclose = (event) => {
      setState("disconnected");
      wsRef.current = null;
      onDisconnect?.();

      // Don't reconnect if session was replaced by another tab (code 4001)
      if (event.code === 4001) return;

      if (reconnect && retriesRef.current < maxRetries) {
        const delay = Math.min(1000 * 2 ** retriesRef.current, 30000);
        setState("reconnecting");
        reconnectTimerRef.current = setTimeout(() => {
          retriesRef.current++;
          connect();
        }, delay);
      }
    };

    ws.onerror = () => {
      ws.close();
    };

    wsRef.current = ws;
  }, [path, onMessage, onConnect, onDisconnect, reconnect, maxRetries]);

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    retriesRef.current = maxRetries; // prevent reconnect
    wsRef.current?.close();
    wsRef.current = null;
    setState("disconnected");
  }, [maxRetries]);

  const send = useCallback((data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      connect();
    }
    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  return { state, send, disconnect, reconnect: connect };
}
