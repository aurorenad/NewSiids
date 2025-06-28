import { Stomp } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

let stompClient = null;

export const connectWebSocket = (employeeId, onNotification, onError) => {
    const socket = new SockJS('/ws');
    stompClient = Stomp.over(socket);

    stompClient.connect({}, () => {
        stompClient.subscribe(`/user/${employeeId}/notifications`, (message) => {
            const notification = JSON.parse(message.body);
            onNotification(notification);
        });

        // Send connection message
        stompClient.send("/app/connect", {}, employeeId);
    }, (error) => {
        onError('Connection error: ' + error);
    });
};

export const disconnectWebSocket = () => {
    if (stompClient) {
        stompClient.disconnect();
    }
};