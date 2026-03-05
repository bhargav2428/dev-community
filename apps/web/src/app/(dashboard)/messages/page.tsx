'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { apiClient } from '@/lib/api-client';
import { useSocket } from '@/lib/socket-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  MessageSquare,
  Search,
  Send,
  Phone,
  Video,
  Info,
  Smile,
  Paperclip,
  Check,
  CheckCheck,
  Image as ImageIcon,
  Mic,
  File,
  X,
  Play,
  Pause,
  Download,
  StopCircle,
} from 'lucide-react';
import { formatRelativeTime, cn } from '@/lib/utils';

interface Attachment {
  url: string;
  filename: string;
  fileType: string;
  fileSize: number;
  messageType: 'IMAGE' | 'AUDIO' | 'VIDEO' | 'FILE';
  duration?: number;
  thumbnail?: string;
}

interface Message {
  id: string;
  content: string;
  type: 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'FILE' | 'CODE' | 'SYSTEM';
  attachments?: Attachment[];
  senderId: string;
  createdAt: string;
  readAt?: string;
}

export default function MessagesPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const { socket } = useSocket();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch conversations
  const { data: conversations, isLoading: conversationsLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => apiClient.get('/messages/conversations'),
  });

  // Fetch messages for selected conversation
  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ['messages', selectedConversation],
    queryFn: () => apiClient.get(`/messages/conversations/${selectedConversation}/messages`),
    enabled: !!selectedConversation,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (data: { content: string; messageType?: string; attachments?: Attachment[] }) =>
      apiClient.post(`/messages/conversations/${selectedConversation}/messages`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', selectedConversation] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setMessageInput('');
      setAttachments([]);
    },
  });

  // Upload file mutation
  const uploadFileMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return apiClient.post('/upload/message', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
  });

  // Listen for new messages
  useEffect(() => {
    if (socket) {
      socket.on('new_message', (data) => {
        queryClient.invalidateQueries({ queryKey: ['messages', data.conversationId] });
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      });

      return () => {
        socket.off('new_message');
      };
    }
  }, [socket, queryClient]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle file upload
  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    setIsUploading(true);
    setShowAttachmentMenu(false);
    
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const result = await uploadFileMutation.mutateAsync(file);
        return result.data as Attachment;
      });
      
      const uploadedAttachments = await Promise.all(uploadPromises);
      setAttachments(prev => [...prev, ...uploadedAttachments]);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
    }
  }, [uploadFileMutation]);

  // Handle voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `voice-message-${Date.now()}.webm`, { type: 'audio/webm' });
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        
        // Upload the audio file
        setIsUploading(true);
        try {
          const result = await uploadFileMutation.mutateAsync(audioFile);
          const attachment = result.data as Attachment;
          attachment.duration = recordingTime;
          setAttachments(prev => [...prev, attachment]);
        } catch (error) {
          console.error('Audio upload failed:', error);
        } finally {
          setIsUploading(false);
          setRecordingTime(0);
        }
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      
      // Start timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  };

  // Format recording time
  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Remove attachment
  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!messageInput.trim() && attachments.length === 0) || !selectedConversation) return;
    
    const messageType = attachments.length > 0 ? attachments[0].messageType : 'TEXT';
    
    sendMessageMutation.mutate({
      content: messageInput.trim(),
      messageType,
      attachments: attachments.length > 0 ? attachments : undefined,
    });
  };

  const selectedConversationData = conversations?.data?.find(
    (c: any) => c.id === selectedConversation
  );

  // Render attachment preview
  const renderAttachmentPreview = (attachment: Attachment, index: number) => {
    if (attachment.messageType === 'IMAGE') {
      return (
        <div key={index} className="relative w-20 h-20 rounded-lg overflow-hidden group">
          <img src={attachment.url} alt={attachment.filename} className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => removeAttachment(index)}
            className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="h-3 w-3 text-white" />
          </button>
        </div>
      );
    }
    
    if (attachment.messageType === 'AUDIO') {
      return (
        <div key={index} className="relative flex items-center gap-2 px-3 py-2 bg-muted rounded-lg group">
          <Mic className="h-4 w-4 text-primary" />
          <span className="text-sm truncate max-w-[100px]">{attachment.filename}</span>
          <button
            type="button"
            onClick={() => removeAttachment(index)}
            className="w-5 h-5 bg-muted-foreground/20 rounded-full flex items-center justify-center"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      );
    }
    
    return (
      <div key={index} className="relative flex items-center gap-2 px-3 py-2 bg-muted rounded-lg group">
        <File className="h-4 w-4 text-primary" />
        <div className="flex-1 min-w-0">
          <p className="text-sm truncate">{attachment.filename}</p>
          <p className="text-xs text-muted-foreground">{formatFileSize(attachment.fileSize)}</p>
        </div>
        <button
          type="button"
          onClick={() => removeAttachment(index)}
          className="w-5 h-5 bg-muted-foreground/20 rounded-full flex items-center justify-center"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  };

  // Render message content based on type
  const renderMessageContent = (message: Message, isMine: boolean) => {
    const msgAttachments = message.attachments || [];
    
    // Render images
    if (message.type === 'IMAGE' && msgAttachments.length > 0) {
      return (
        <div className="space-y-2">
          <div className={cn(
            "grid gap-1",
            msgAttachments.length === 1 ? "grid-cols-1" : "grid-cols-2"
          )}>
            {msgAttachments.map((att, i) => (
              <a key={i} href={att.url} target="_blank" rel="noopener noreferrer">
                <img 
                  src={att.url} 
                  alt={att.filename} 
                  className="rounded-lg max-w-[250px] max-h-[300px] object-cover cursor-pointer hover:opacity-90 transition-opacity"
                />
              </a>
            ))}
          </div>
          {message.content && <p className="mt-2">{message.content}</p>}
        </div>
      );
    }
    
    // Render audio
    if (message.type === 'AUDIO' && msgAttachments.length > 0) {
      return (
        <div className="space-y-2">
          {msgAttachments.map((att, i) => (
            <AudioPlayer key={i} src={att.url} duration={att.duration} isMine={isMine} />
          ))}
          {message.content && <p className="mt-2">{message.content}</p>}
        </div>
      );
    }
    
    // Render video
    if (message.type === 'VIDEO' && msgAttachments.length > 0) {
      return (
        <div className="space-y-2">
          {msgAttachments.map((att, i) => (
            <video 
              key={i}
              src={att.url} 
              controls 
              className="rounded-lg max-w-[300px] max-h-[200px]"
            />
          ))}
          {message.content && <p className="mt-2">{message.content}</p>}
        </div>
      );
    }
    
    // Render files
    if (message.type === 'FILE' && msgAttachments.length > 0) {
      return (
        <div className="space-y-2">
          {msgAttachments.map((att, i) => (
            <a 
              key={i}
              href={att.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg",
                isMine ? "bg-primary-foreground/10" : "bg-background/50"
              )}
            >
              <File className="h-8 w-8 text-primary" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{att.filename}</p>
                <p className={cn(
                  "text-xs",
                  isMine ? "text-primary-foreground/70" : "text-muted-foreground"
                )}>
                  {formatFileSize(att.fileSize)}
                </p>
              </div>
              <Download className="h-5 w-5" />
            </a>
          ))}
          {message.content && <p className="mt-2">{message.content}</p>}
        </div>
      );
    }
    
    // Default: text message
    return <p>{message.content}</p>;
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex">
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        multiple
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
        onChange={(e) => handleFileUpload(e.target.files)}
      />
      <input
        ref={imageInputRef}
        type="file"
        className="hidden"
        multiple
        accept="image/*"
        onChange={(e) => handleFileUpload(e.target.files)}
      />
      <input
        ref={audioInputRef}
        type="file"
        className="hidden"
        accept="audio/*"
        onChange={(e) => handleFileUpload(e.target.files)}
      />

      {/* Conversations List */}
      <div className={cn(
        "w-full md:w-80 border-r flex flex-col",
        selectedConversation && "hidden md:flex"
      )}>
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold mb-4">Messages</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversationsLoading ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-12 h-12 rounded-full bg-muted" />
                  <div className="flex-1">
                    <div className="h-4 bg-muted rounded w-24 mb-2" />
                    <div className="h-3 bg-muted rounded w-32" />
                  </div>
                </div>
              ))}
            </div>
          ) : conversations?.data?.length > 0 ? (
            <div>
              {conversations.data.map((conversation: any) => {
                const otherUser = conversation.participants?.find(
                  (p: any) => p.userId !== session?.user?.id
                )?.user;
                const isSelected = selectedConversation === conversation.id;
                
                return (
                  <button
                    key={conversation.id}
                    className={cn(
                      "w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors text-left",
                      isSelected && "bg-muted"
                    )}
                    onClick={() => setSelectedConversation(conversation.id)}
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0">
                      <span className="text-lg font-medium text-primary">
                        {otherUser?.displayName?.[0] || otherUser?.username?.[0] || '?'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium truncate">
                          {otherUser?.displayName || otherUser?.username || 'Unknown'}
                        </p>
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(conversation.updatedAt)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {conversation.lastMessage?.content || 'No messages yet'}
                      </p>
                    </div>
                    {conversation.unreadCount > 0 && (
                      <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                        {conversation.unreadCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No conversations yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Start a conversation from a user's profile
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className={cn(
        "flex-1 flex flex-col",
        !selectedConversation && "hidden md:flex"
      )}>
        {selectedConversation ? (
          <>
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  className="md:hidden p-2 hover:bg-muted rounded-md"
                  onClick={() => setSelectedConversation(null)}
                >
                  ←
                </button>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <span className="font-medium text-primary">
                    {selectedConversationData?.participants?.[0]?.user?.displayName?.[0] || '?'}
                  </span>
                </div>
                <div>
                  <p className="font-medium">
                    {selectedConversationData?.participants?.find(
                      (p: any) => p.userId !== session?.user?.id
                    )?.user?.displayName || 'User'}
                  </p>
                  <p className="text-xs text-muted-foreground">Online</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon">
                  <Phone className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon">
                  <Video className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon">
                  <Info className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messagesLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : (messages?.data?.length ?? 0) > 0 ? (
                <>
                  {messages?.data?.map((message: Message) => {
                    const isMine = message.senderId === session?.user?.id;
                    return (
                      <div
                        key={message.id}
                        className={cn(
                          "flex",
                          isMine ? "justify-end" : "justify-start"
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[70%] rounded-2xl px-4 py-2",
                            isMine
                              ? "bg-primary text-primary-foreground rounded-br-sm"
                              : "bg-muted rounded-bl-sm"
                          )}
                        >
                          {renderMessageContent(message, isMine)}
                          <div className={cn(
                            "flex items-center gap-1 mt-1 text-xs",
                            isMine ? "text-primary-foreground/70" : "text-muted-foreground"
                          )}>
                            <span>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {isMine && (
                              message.readAt ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">No messages yet. Say hello!</p>
                </div>
              )}
            </div>

            {/* Input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t">
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" size="icon">
                  <Paperclip className="h-5 w-5" />
                </Button>
                <Input
                  placeholder="Type a message..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  className="flex-1"
                />
                <Button type="button" variant="ghost" size="icon">
                  <Smile className="h-5 w-5" />
                </Button>
                <Button type="submit" size="icon" disabled={!messageInput.trim()}>
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-medium mb-2">Your Messages</h2>
              <p className="text-muted-foreground">
                Select a conversation to start messaging
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
