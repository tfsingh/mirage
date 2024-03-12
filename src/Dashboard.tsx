import React, { useEffect, useRef, useState } from 'react';
import { Box, List, ListItem, ListItemText, TextField, AppBar, Toolbar, Typography, IconButton, Container, Tooltip } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SendIcon from '@mui/icons-material/Send';
import Config from './Config';

interface Chat {
  model_name: string;
  model_id: number;
}

interface Message {
  text: string;
  timestamp: Date;
}

const Dashboard = () => {
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const [chats, setChats] = useState<Chat[]>([
    { model_name: 'Chat 1', model_id: 1 },
    { model_name: 'Chat 2', model_id: 2 },
  ]);

  const [currentChat, setCurrentChat] = useState<number | null>(() => {
    const savedCurrentChat = localStorage.getItem('current_chat');
    return savedCurrentChat ? JSON.parse(savedCurrentChat) : chats[0]?.model_id || null;
  });

  const [currentMessage, setCurrentMessage] = useState('');
  const [messages, setMessages] = useState<Record<number, Message[]>>({});
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    if (messagesContainerRef.current) {
      const { scrollHeight, clientHeight } = messagesContainerRef.current;
      messagesContainerRef.current.scrollTop = scrollHeight - clientHeight;
    }
  }, [messages]);

  useEffect(() => {
    const storedMessages = localStorage.getItem('chat_messages');
    if (storedMessages) {
      setMessages(JSON.parse(storedMessages));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('current_chat', JSON.stringify(currentChat));
  }, [currentChat]);

  const handleSendMessage = () => {
    const newMessage: Message = { text: currentMessage, timestamp: new Date() };
    const updatedMessages = {
      ...messages,
      [currentChat!]: [...(messages[currentChat!] || []), newMessage],
    };

    setMessages(updatedMessages);
    localStorage.setItem('chat_messages', JSON.stringify(updatedMessages));
    setCurrentMessage('');
  };

  const handleClearChat = () => {
    const updatedMessages = { ...messages, [currentChat!]: [] };
    setMessages(updatedMessages);
    localStorage.setItem('chat_messages', JSON.stringify(updatedMessages));
  };

  if (showConfig) {
    return <Config />;
  }

  return (
    <Container>
      <Box sx={{ display: 'flex', height: '92vh', flexDirection: 'column', m: 0 }}>
        <AppBar position="static" sx={{ bgcolor: '#9ab08f', m: 0 }}>
          <Toolbar sx={{ m: 0, p: 0 }}>
            <div style={{ flexGrow: 1 }}></div>

            <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, fontSize: '28px', display: 'flex', justifyContent: 'center', ml: '90px', color: '#3a4037' }}>
              mirage
            </Typography>

            <div style={{ flexGrow: 1 }}></div>

            <IconButton onClick={handleClearChat}>
              <Tooltip title="clear chat" placement="top">
                <DeleteIcon />
              </Tooltip>
            </IconButton>
            <IconButton onClick={() => setShowConfig(true)}>
              <Tooltip title="create new chat" placement="top">
                <AddIcon />
              </Tooltip>
            </IconButton>
          </Toolbar>
        </AppBar>


        <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden', boxShadow: 4 }}>
          <List sx={{ minWidth: '20%', overflowY: 'auto', bgcolor: '#BCC6BC', m: 0, mt: -1 }}>
            {chats.map((chat, i) => (
              <ListItem
                button
                key={chat.model_id}
                onClick={() => setCurrentChat(chat.model_id)}
                sx={{ bgcolor: currentChat === chat.model_id ? 'rgba(0, 0, 0, 0.1)' : 'inherit' }}
              >
                <ListItemText primary={chat.model_name} />
              </ListItem>
            ))}
          </List>

          <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            <Box
              sx={{ flexGrow: 1, overflow: 'auto', p: 3, bgcolor: '#F2F1E9', whiteSpace: 'pre-wrap', wordBreak: 'break-word', mb: -3, mt: -1 }}
              ref={messagesContainerRef}
            >
              {currentChat !== null && messages[currentChat]?.map((msg: Message, index: number) => (
                <Typography key={index} sx={{ textAlign: 'left', overflowWrap: 'break-word', mb: 1 }}>
                  {msg.text}
                </Typography>
              ))}
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', p: 1, bgcolor: '#F2F1E9' }}>
              <TextField
                fullWidth
                variant="outlined"
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                placeholder="Type your message here..."
                sx={{ mr: 1 }}
              />
              <IconButton color="primary" onClick={handleSendMessage}>
                <SendIcon sx={{ color: 'grey' }} />
              </IconButton>
            </Box>
          </Box>
        </Box>
      </Box>
    </Container>
  );
};

export default Dashboard;
