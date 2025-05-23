'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Card } from '@/app/components/ui/card';

interface Message {
  id: string;
  content: string;
  createdAt: string;
  isAdminMessage: boolean;
  isRead: boolean;
  user: {
    id: string;
    name: string | null;
    image: string | null;
    isAdmin: boolean;
  };
}

interface ChatInterfaceProps {
  bookingId: string;
}

export function ChatInterface({ bookingId }: ChatInterfaceProps) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  // Fetch messages
  const fetchMessages = async () => {
    console.log('Fetching messages for booking:', bookingId);
    try {
      const response = await fetch(`/api/bookings/${bookingId}/messages`);
      console.log('Messages response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Messages data:', data);
        setMessages(data.messages);
        
        // Mark messages as read when they are viewed
        const unreadMessages = data.messages.filter(
          (message: Message) => 
            !message.isRead && 
            message.isAdminMessage !== !!session?.user?.isAdmin // Only mark messages from the other party as read
        );
        
        if (unreadMessages.length > 0) {
          markMessagesAsRead();
        }
        
        // Scroll to bottom after messages load
        setTimeout(scrollToBottom, 100);
      } else {
        const errorData = await response.text();
        console.error('Failed to fetch messages:', response.status, errorData);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };
  
  // Mark messages in this booking as read
  const markMessagesAsRead = async () => {
    try {
      await fetch('/api/messages/mark-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bookingId }),
      });
      
      // Update the unread count in the header by triggering a refetch
      const event = new CustomEvent('refreshUnreadCount');
      window.dispatchEvent(event);
      
      // Update local state to reflect messages as read
      setMessages(prevMessages => 
        prevMessages.map(msg => ({
          ...msg,
          isRead: msg.isAdminMessage !== !!session?.user?.isAdmin ? true : msg.isRead
        }))
      );
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
    }
  };
  
  // Initial fetch
  useEffect(() => {
    fetchMessages();
    
    // Set up polling for new messages every 10 seconds
    const interval = setInterval(fetchMessages, 10000);
    return () => clearInterval(interval);
  }, [bookingId, session]);
  
  // Effect to scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Send a new message
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/bookings/${bookingId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: newMessage }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setMessages([...messages, data]);
        setNewMessage('');
        
        // Trigger refresh of unread count for other users
        const event = new CustomEvent('refreshUnreadCount');
        window.dispatchEvent(event);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };
  
  return (
    <div className="flex flex-col h-[500px] border rounded-lg overflow-hidden">
      <div className="p-3 border-b bg-gray-50 flex-shrink-0">
        <h3 className="font-medium">Booking Communication</h3>
        <p className="text-sm text-gray-500">
          Chat with {session?.user?.isAdmin ? 'the customer' : 'RideReady support'} about this booking
        </p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4" ref={scrollAreaRef}>
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            No messages yet. Start the conversation!
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.isAdminMessage ? 'justify-start' : 'justify-end'
                }`}
              >
                <div className={`flex max-w-[80%] ${message.isAdminMessage ? 'flex-row' : 'flex-row-reverse'}`}>
                  <Avatar className={`h-8 w-8 ${message.isAdminMessage ? 'mr-2' : 'ml-2'}`}>
                    <AvatarImage src={message.user.image || ''} alt={message.user.name || 'User'} />
                    <AvatarFallback className={message.isAdminMessage ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'}>
                      {message.user.name ? message.user.name[0].toUpperCase() : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <Card className={`p-3 ${message.isAdminMessage ? 'bg-red-50' : 'bg-blue-50'}`}>
                    <div className="text-sm">
                      {message.content}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {formatDate(message.createdAt)}
                    </div>
                  </Card>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      
      <form onSubmit={sendMessage} className="p-3 border-t flex gap-2 flex-shrink-0 bg-white">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          disabled={loading}
          className="flex-1"
        />
        <Button type="submit" disabled={loading || !newMessage.trim()}>
          {loading ? 'Sending...' : 'Send'}
        </Button>
      </form>
    </div>
  );
}
