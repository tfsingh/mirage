import React, { useEffect, useRef, useState } from 'react';
import { Box, List, ListItem, ListItemText, TextField, AppBar, Toolbar, Typography, IconButton, Container } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SendIcon from '@mui/icons-material/Send';
import Config from './Config';

const Dashboard = () => {

  const messagesContainerRef = useRef(null);

  const [chats, setChats] = useState([
    { model_name: 'Chat 1', model_id: 1 },
    { model_name: 'Chat 2', model_id: 2 },
  ]);


  const [currentChat, setCurrentChat] = useState(() => {
    const savedCurrentChat = localStorage.getItem('current_chat');
    return savedCurrentChat ? JSON.parse(savedCurrentChat) : chats[0]?.model_id || null;
  });

  const [currentMessage, setCurrentMessage] = useState('');
  const [messages, setMessages] = useState({});
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
    const newMessage = { text: currentMessage, timestamp: new Date() };
    const updatedMessages = {
      ...messages,
      [currentChat]: [...(messages[currentChat] || []), newMessage],
    };

    setMessages(updatedMessages);
    localStorage.setItem('chat_messages', JSON.stringify(updatedMessages));
    setCurrentMessage('');
  };

  const handleClearChat = () => {
    const updatedMessages = { ...messages, [currentChat]: [] };
    setMessages(updatedMessages);
    localStorage.setItem('chat_messages', JSON.stringify(updatedMessages));
  };

  if (showConfig) {
    return <Config />;
  }

  return (
    <Container>
      <Box sx={{ display: 'flex', height: '90vh', flexDirection: 'column' }}>
        <AppBar position="static" sx={{ bgcolor: '#9ab08f' }}>
          <Toolbar>
            <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
              Mirage
            </Typography>
            <IconButton color="inherit" onClick={handleClearChat}>
              <DeleteIcon />
            </IconButton>
            <IconButton color="inherit" onClick={() => setShowConfig(true)}>
              <AddIcon />
            </IconButton>
          </Toolbar>
        </AppBar>

        <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden', boxShadow: 4 }}>
          <List sx={{ minWidth: '240px', overflowY: 'auto', bgcolor: '#BCC6BC' }}>
            {chats.map((chat) => (
              <ListItem button key={chat.model_id} onClick={() => setCurrentChat(chat.model_id)}>
                <ListItemText primary={chat.model_name} />
              </ListItem>
            ))}
          </List>

          <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            <Box
              sx={{ flexGrow: 1, overflow: 'auto', p: 3, bgcolor: '#F2F1E9', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
              ref={messagesContainerRef}
            >
              {messages[currentChat]?.map((msg, index) => (
                <Typography key={index} sx={{ textAlign: 'left', overflowWrap: 'break-word' }}>
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
                <SendIcon />
              </IconButton>
            </Box>
          </Box>
        </Box>
      </Box>
    </Container>
  );
};

export default Dashboard;
