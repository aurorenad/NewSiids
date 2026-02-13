import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

let stompClient = null;

export const connectWebSocket = (employeeId, onNotification, onError) => {
    if (!employeeId) return;
    console.log(`Connecting WebSocket for employee: ${employeeId}`);

    // Disconnect existing connection if it exists
    if (stompClient) {
        stompClient.deactivate();
    }

    // Create new client
    stompClient = new Client({
        webSocketFactory: () => new SockJS(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:2005'}/ws-notifications`),
        connectHeaders: {
            'employee_id': employeeId
        },
        debug: (str) => {
            console.log('STOMP Debug:', str);
        },
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,

        onConnect: (frame) => {
            console.log('Connected to WebSocket:', frame);

            stompClient.subscribe(`/user/${employeeId}/notifications`, (message) => {
                console.log('Received notification:', message.body);
                try {
                    const notification = JSON.parse(message.body);
                    onNotification(notification);
                } catch (err) {
                    console.error('Error parsing notification:', err);
                    onError(err);
                }
            });

            stompClient.publish({
                destination: '/app/connect',
                body: JSON.stringify(employeeId)
            });
        },

        onDisconnect: (frame) => {
            console.log('Disconnected from WebSocket:', frame);
        },

        onStompError: (frame) => {
            console.error('STOMP Error:', frame);
            onError(frame);
        },

        onWebSocketError: (error) => {
            console.error('WebSocket Error:', error);
            onError(error);
        }
    });

    stompClient.activate();
};

export const disconnectWebSocket = () => {
    if (stompClient) {
        console.log('Disconnecting WebSocket');
        stompClient.deactivate();
        stompClient = null;
    }
};

export const getStompClient = () => stompClient;