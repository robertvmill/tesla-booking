'use client';

// Import necessary dependencies for the inbox page functionality
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { MessageSquare, ArrowRightIcon, CircleDot } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Skeleton } from '@/app/components/ui/skeleton';

// Define types for our data structures
interface Vehicle {
  id: string;
  model: string;
}

interface Booking {
  id: string;
  startDate: string;
  endDate: string;
  vehicle: Vehicle;
  user?: User; // Added user for admin view
}

interface User {
  id: string;
  name: string | null;
  email?: string | null; // Added email for admin view
  image: string | null;
  isAdmin: boolean;
}

interface Message {
  id: string;
  content: string;
  createdAt: string;
  isAdminMessage: boolean;
  bookingId: string;
  booking: Booking;
  user: User;
  isRead: boolean;
}

// Main inbox page component that displays user messages grouped by booking
export default function InboxPage() {
  // Set up state management and authentication
  const { status } = useSession();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Handle authentication and data fetching on component mount
  useEffect(() => {
    // Redirect to login if not authenticated
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/inbox');
      return;
    }

    // Fetch messages if authenticated
    if (status === 'authenticated') {
      fetchMessages();
    }
    
    // Add event listener for refreshing messages
    const handleRefresh = () => {
      if (status === 'authenticated') {
        fetchMessages();
      }
    };
    
    window.addEventListener('refreshUnreadCount', handleRefresh);
    
    // Cleanup event listener
    return () => {
      window.removeEventListener('refreshUnreadCount', handleRefresh);
    };
  }, [status, router]);

  // Fetch messages from the API
  const fetchMessages = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/messages');
      
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      
      const data = await response.json();
      setMessages(data.messages);
      
      // Check if the current user is an admin
      const userResponse = await fetch('/api/user');
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setIsAdmin(userData.user.isAdmin);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError('Failed to load your messages. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  // Mark messages as read when viewing a conversation
  const markMessagesAsRead = async (bookingId: string) => {
    try {
      await fetch('/api/messages/mark-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bookingId }),
      });
      
      // Update local state to reflect read status
      setMessages(prevMessages => 
        prevMessages.map(msg => {
          if (msg.bookingId === bookingId) {
            if (isAdmin && !msg.isAdminMessage) {
              return { ...msg, isRead: true };
            } else if (!isAdmin && msg.isAdminMessage) {
              return { ...msg, isRead: true };
            }
          }
          return msg;
        })
      );
      
      // Dispatch event to refresh unread count in header
      window.dispatchEvent(new Event('refreshUnreadCount'));
      
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
    }
  };

  // Utility function to format dates consistently
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy h:mm a');
  };

  // Check if a booking has any unread messages
  const hasUnreadMessages = (bookingMessages: Message[]) => {
    if (isAdmin) {
      return bookingMessages.some(msg => !msg.isAdminMessage && !msg.isRead);
    }
    return bookingMessages.some(msg => msg.isAdminMessage && !msg.isRead);
  };

  // Organize messages by booking for grouped display
  const groupedMessages = messages.reduce((acc, message) => {
    if (!acc[message.bookingId]) {
      acc[message.bookingId] = {
        booking: message.booking,
        messages: []
      };
    }
    acc[message.bookingId].messages.push(message);
    return acc;
  }, {} as Record<string, { booking: Booking, messages: Message[] }>);

  // Display loading skeleton while data is being fetched
  if (status === 'loading' || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Inbox</h1>
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-1/3 mb-2" />
                <Skeleton className="h-6 w-3/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Main inbox interface rendering
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Inbox {isAdmin && "(Admin View)"}</h1>
      
      {/* Display error message if fetch failed */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}
      
      {/* Show empty state if no messages exist */}
      {Object.keys(groupedMessages).length === 0 ? (
        <div className="bg-gray-50 p-8 rounded-lg text-center">
          <MessageSquare className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-medium text-gray-700 mb-2">No messages yet</h2>
          <p className="text-gray-500 mb-4">You don&apos;t have any messages in your inbox.</p>
          <Link href="/bookings">
            <Button>View Your Bookings</Button>
          </Link>
        </div>
      ) : (
        // Display message groups sorted by booking
        <div className="space-y-6">
          {Object.entries(groupedMessages).map(([bookingId, { booking, messages }]) => {
            // Sort messages by date (newest first)
            const sortedMessages = [...messages].sort((a, b) => 
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            
            // Get the latest message for preview
            const latestMessage = sortedMessages[0];
            const conversationHasUnread = hasUnreadMessages(messages);
            
            return (
              <Link 
                key={bookingId}
                href={`/bookings/${bookingId}`}
                onClick={() => markMessagesAsRead(bookingId)}
                className="block"
              >
                <Card 
                  className={`hover:shadow-md transition-all duration-200 cursor-pointer ${
                    conversationHasUnread 
                      ? 'border-l-4 border-l-red-500 bg-red-50/30 shadow-sm' 
                      : 'border-l-4 border-l-transparent hover:border-l-gray-200'
                  }`}
                >
                  {/* Booking header with vehicle and date information */}
                  <CardHeader className={conversationHasUnread ? 'bg-white/80' : ''}>
                    <div className="flex justify-between items-start">
                      <div className="flex items-center">
                        {conversationHasUnread && (
                          <div className="flex items-center mr-3">
                            <CircleDot className="h-3 w-3 text-red-500 mr-1 flex-shrink-0 animate-pulse" />
                            <span className="text-xs font-semibold text-red-600 bg-red-100 px-2 py-1 rounded-full">
                              UNREAD
                            </span>
                          </div>
                        )}
                        <div>
                          <CardTitle className={`text-lg ${conversationHasUnread ? 'text-gray-900 font-semibold' : 'text-gray-700'}`}>
                            {booking.vehicle.model}
                            {isAdmin && booking.user && (
                              <span className="ml-2 text-sm font-normal text-gray-500">
                                (Booked by: {booking.user.name || booking.user.email})
                              </span>
                            )}
                          </CardTitle>
                          <CardDescription className={conversationHasUnread ? 'text-gray-600' : 'text-gray-500'}>
                            {format(new Date(booking.startDate), 'MMM d')} - {format(new Date(booking.endDate), 'MMM d, yyyy')}
                          </CardDescription>
                        </div>
                      </div>
                      <Button 
                        variant={conversationHasUnread ? "default" : "outline"} 
                        size="sm" 
                        className={`flex items-center gap-1 ${
                          conversationHasUnread 
                            ? 'bg-red-600 hover:bg-red-700 text-white' 
                            : ''
                        }`}
                      >
                        View Conversation
                        <ArrowRightIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  {/* Latest message preview */}
                  <CardContent className={conversationHasUnread ? 'bg-white/80' : ''}>
                    <div className="flex items-start gap-3">
                      <div className={`rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 text-sm font-medium ${
                        (latestMessage.isAdminMessage && !latestMessage.isRead && !isAdmin) || 
                        (!latestMessage.isAdminMessage && !latestMessage.isRead && isAdmin)
                          ? 'bg-red-500 text-white shadow-md'
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        {latestMessage.isAdminMessage ? 'R' : (isAdmin ? latestMessage.user.name?.charAt(0) || 'U' : 'Y')}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <div className="flex items-center">
                            <p className={`font-medium text-sm ${
                              (latestMessage.isAdminMessage && !latestMessage.isRead && !isAdmin) || 
                              (!latestMessage.isAdminMessage && !latestMessage.isRead && isAdmin)
                                ? 'text-red-700 font-semibold'
                                : 'text-gray-700'
                            }`}>
                              {latestMessage.isAdminMessage ? 'RideReady Support' : (isAdmin ? (latestMessage.user.name || latestMessage.user.email) : 'You')}
                            </p>
                            {((latestMessage.isAdminMessage && !latestMessage.isRead && !isAdmin) || 
                             (!latestMessage.isAdminMessage && !latestMessage.isRead && isAdmin)) && (
                              <span className="ml-2 text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-medium shadow-sm">
                                NEW
                              </span>
                            )}
                          </div>
                          <p className={`text-xs ${
                            (latestMessage.isAdminMessage && !latestMessage.isRead && !isAdmin) || 
                            (!latestMessage.isAdminMessage && !latestMessage.isRead && isAdmin)
                              ? 'text-red-600 font-medium'
                              : 'text-gray-500'
                          }`}>
                            {formatDate(latestMessage.createdAt)}
                          </p>
                        </div>
                        <p className={`line-clamp-2 ${
                          (latestMessage.isAdminMessage && !latestMessage.isRead && !isAdmin) ||
                          (!latestMessage.isAdminMessage && !latestMessage.isRead && isAdmin)
                            ? 'font-semibold text-gray-900'
                            : 'text-gray-600'
                        }`}>
                          {latestMessage.content}
                        </p>
                      </div>
                    </div>
                    
                    {/* Show message count if there are multiple messages */}
                    {messages.length > 1 && (
                      <div className={`mt-3 text-sm flex items-center justify-between ${
                        conversationHasUnread ? 'text-gray-700' : 'text-gray-500'
                      }`}>
                        <span>{messages.length} messages in this conversation</span>
                        {conversationHasUnread && (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
                            {messages.filter(msg => 
                              isAdmin 
                                ? !msg.isAdminMessage && !msg.isRead 
                                : msg.isAdminMessage && !msg.isRead
                            ).length} unread
                          </span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
