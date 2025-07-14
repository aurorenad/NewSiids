import { Stomp } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

let stompClient = null;

export const connectWebSocket = (employeeId, onNotification, onError) => {
    console.log('Connecting WebSocket for employee:', employeeId);

    const socket = new SockJS('/ws-notifications');
    stompClient = Stomp.over(socket);

    // Enable debug logging
    stompClient.debug = (str) => {
        console.log('STOMP Debug:', str);
    };

    stompClient.connect({}, (frame) => {
        console.log('Connected to WebSocket:', frame);

        const subscription = stompClient.subscribe(`/user/${employeeId}/notifications`, (message) => {
            console.log('Received notification:', message.body);
            try {
                const notification = JSON.parse(message.body);
                onNotification(notification);
            } catch (e) {
                console.error('Failed to parse notification:', e);
            }
        });

        console.log('Subscribed to notifications for employee:', employeeId);

        stompClient.send("/app/connect", {}, employeeId);
        console.log('Sent connect message for employee:', employeeId);

    }, (error) => {
        console.error('WebSocket connection error:', error);
        onError('Connection error: ' + error);
    });
};

export const disconnectWebSocket = () => {
    if (stompClient) {
        console.log('Disconnecting WebSocket');
        stompClient.disconnect();
        stompClient = null;
    }
};