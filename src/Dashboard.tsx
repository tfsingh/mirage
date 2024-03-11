import React, { useEffect, useState } from 'react';
import { Box, List, ListItem, ListItemText, TextField, Button, AppBar, Toolbar, Typography, IconButton, Container } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import Config from './Config';

const Dashboard = () => {
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
      <Box sx={{ display: 'flex', height: '100vh', flexDirection: 'column' }}>
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
              Mirage
            </Typography>
            <IconButton color="inherit" onClick={() => setShowConfig(true)}>
              <AddIcon />
            </IconButton>
            <IconButton color="inherit" onClick={handleClearChat}>
              <DeleteIcon />
            </IconButton>
          </Toolbar>
        </AppBar>

        <Box sx={{ display: 'flex', flexGrow: 1 }}>
          <List sx={{ width: '240px' }}>
            {chats.map((chat) => (
              <ListItem button key={chat.model_id} onClick={() => setCurrentChat(chat.model_id)}>
                <ListItemText primary={chat.model_name} />
              </ListItem>
            ))}
          </List>

          <Box sx={{ flexGrow: 1, overflow: 'auto', p: 3 }}>
            {messages[currentChat]?.map((msg, index) => (
              <Typography key={index} sx={{ textAlign: 'left' }}>
                {msg.text}
              </Typography>
            ))}
          </Box>
        </Box>

        <Box sx={{ p: 1, display: 'flex', alignItems: 'center' }}>
          <TextField
            fullWidth
            variant="outlined"
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            placeholder="Type your message here..."
          />
          <Button variant="contained" onClick={handleSendMessage} sx={{ ml: 1 }}>
            Send
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default Dashboard;
