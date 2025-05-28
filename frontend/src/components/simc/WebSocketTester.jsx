import React, { useEffect, useState, useRef } from 'react';
import { Button, Card, Form, ListGroup, Alert } from 'react-bootstrap';

const WebSocketTester = () => {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [status, setStatus] = useState('disconnected');
  const [error, setError] = useState(null);
  
  const socketRef = useRef(null);

  const connectToSocket = () => {
    try {
      setStatus('connecting');
      setError(null);
      
      // Use current window location to build WebSocket URL
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = "localhost:8000";  // includes port if present
      
      // Use the test endpoint
      const url = `${protocol}//${host}/api/test-socket`;
      
      console.log('Connecting to WebSocket:', url);
      const socket = new WebSocket(url);
      socketRef.current = socket;
      
      socket.onopen = () => {
        console.log('WebSocket connection opened');
        setConnected(true);
        setStatus('connected');
        setMessages(prev => [...prev, {
          type: 'system',
          content: 'Connected to server',
          timestamp: new Date().toISOString()
        }]);
      };
      
      socket.onmessage = (event) => {
        try {
          console.log('Received message:', event.data);
          const parsedData = JSON.parse(event.data);
          setMessages(prev => [...prev, {
            ...parsedData,
            received: true,
            timestamp: new Date().toISOString()
          }]);
        } catch (err) {
          console.error('Failed to parse message:', err);
          setMessages(prev => [...prev, {
            type: 'error',
            content: `Failed to parse: ${event.data}`,
            timestamp: new Date().toISOString()
          }]);
        }
      };
      
      socket.onclose = (event) => {
        console.log('WebSocket connection closed:', event.code, event.reason);
        setConnected(false);
        setStatus('disconnected');
        setMessages(prev => [...prev, {
          type: 'system',
          content: `Disconnected: ${event.code} ${event.reason || ''}`,
          timestamp: new Date().toISOString()
        }]);
      };
      
      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setStatus('error');
        setError('Connection error occurred');
        setMessages(prev => [...prev, {
          type: 'error',
          content: 'Connection error',
          timestamp: new Date().toISOString()
        }]);
      };
    } catch (err) {
      console.error('Failed to create WebSocket:', err);
      setStatus('error');
      setError(`Failed to create WebSocket: ${err.message}`);
    }
  };
  
  const disconnectFromSocket = () => {
    if (socketRef.current) {
      socketRef.current.close(1000, 'User initiated disconnect');
      socketRef.current = null;
    }
  };
  
  const sendMessage = () => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN && inputValue) {
      try {
        // Try to send as JSON if it's valid
        let messageToSend = inputValue;
        try {
          // If input looks like JSON, parse and stringify to ensure valid format
          if (inputValue.trim().startsWith('{') || inputValue.trim().startsWith('[')) {
            JSON.parse(inputValue); // Just to validate
            messageToSend = inputValue; // Keep as string for sending
          }
        } catch (err) {
          // Not valid JSON, send as string
          messageToSend = JSON.stringify({ text: inputValue });
        }
        
        socketRef.current.send(messageToSend);
        
        setMessages(prev => [...prev, {
          type: 'sent',
          content: inputValue,
          timestamp: new Date().toISOString()
        }]);
        
        setInputValue('');
      } catch (err) {
        console.error('Failed to send message:', err);
        setMessages(prev => [...prev, {
          type: 'error',
          content: `Failed to send: ${err.message}`,
          timestamp: new Date().toISOString()
        }]);
      }
    }
  };
  
  useEffect(() => {
    return () => {
      // Clean up the socket when component unmounts
      if (socketRef.current) {
        socketRef.current.close(1000, 'Component unmounted');
      }
    };
  }, []);
  
  const getMessageStyle = (message) => {
    switch (message.type) {
      case 'error': return 'danger';
      case 'system': return 'info';
      case 'sent': return 'primary';
      case 'echo': return 'success';
      case 'info': return 'warning';
      default: return 'secondary';
    }
  };
  
  const formatTimestamp = (timestamp) => {
    try {
      return new Date(timestamp).toLocaleTimeString();
    } catch {
      return '';
    }
  };
  
  return (
    <Card className="mt-4">
      <Card.Header>
        <h4>WebSocket Connection Tester</h4>
        <div className="d-flex align-items-center">
          <div className={`status-indicator ${status}`} 
               style={{ 
                 width: '12px', 
                 height: '12px', 
                 borderRadius: '50%', 
                 backgroundColor: status === 'connected' ? 'green' : 
                                status === 'connecting' ? 'orange' : 
                                status === 'error' ? 'red' : 'gray',
                 marginRight: '8px' 
               }} />
          <span>Status: {status}</span>
        </div>
      </Card.Header>
      <Card.Body>
        {error && (
          <Alert variant="danger" className="mb-3">
            {error}
          </Alert>
        )}
        
        <div className="d-flex gap-2 mb-3">
          <Button 
            variant="success" 
            onClick={connectToSocket} 
            disabled={connected}
          >
            Connect
          </Button>
          <Button 
            variant="danger" 
            onClick={disconnectFromSocket} 
            disabled={!connected}
          >
            Disconnect
          </Button>
        </div>
        
        <div style={{ height: '300px', overflowY: 'auto', marginBottom: '1rem' }}>
          <ListGroup>
            {messages.map((message, index) => (
              <ListGroup.Item 
                key={index} 
                variant={getMessageStyle(message)}
                className="d-flex flex-column"
              >
                <small className="text-muted">
                  {formatTimestamp(message.timestamp)}
                  {message.type === 'sent' ? ' (Sent)' : message.type === 'echo' ? ' (Echo)' : ''}
                </small>
                <div>
                  {typeof message.content === 'object' 
                    ? JSON.stringify(message.content) 
                    : message.content}
                </div>
              </ListGroup.Item>
            ))}
          </ListGroup>
        </div>
        
        <Form onSubmit={(e) => { e.preventDefault(); sendMessage(); }}>
          <Form.Group className="mb-3">
            <Form.Control
              as="textarea"
              rows={2}
              placeholder="Enter message to send (plain text or JSON)"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={!connected}
            />
          </Form.Group>
          <Button 
            variant="primary" 
            type="submit" 
            disabled={!connected || !inputValue.trim()}
          >
            Send Message
          </Button>
        </Form>
        
        <div className="mt-3">
          <h5>Test Messages</h5>
          <div className="d-flex gap-2 flex-wrap">
            <Button 
              size="sm" 
              variant="outline-secondary" 
              onClick={() => setInputValue('{"type":"ping","data":"hello server"}')}
              disabled={!connected}
            >
              Ping JSON
            </Button>
            <Button 
              size="sm" 
              variant="outline-secondary" 
              onClick={() => setInputValue('Hello Server!')}
              disabled={!connected}
            >
              Simple Text
            </Button>
            <Button 
              size="sm" 
              variant="outline-secondary" 
              onClick={() => setInputValue('{"simc_input":"base64string"}')}
              disabled={!connected}
            >
              SimC Format
            </Button>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
};

export default WebSocketTester;