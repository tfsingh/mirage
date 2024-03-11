import React, { useEffect, useState } from 'react';
import { Box, Drawer, List, ListItem, ListItemText, TextField, Button, AppBar, Toolbar, Typography, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import Config from './Config';


const drawerWidth = 240;
const textFromNavbar = 60;

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
      [currentChat]: [...(messages[currentChat] || []), newMessage]
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
    return <Config />
  }

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <Drawer
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
          },
        }}
        variant="permanent"
        anchor="left"
      >
        <Toolbar>
          <Typography variant="h6" noWrap component="div">
            Chats
          </Typography>
          <IconButton color="inherit" onClick={() => setShowConfig(true)} sx={{ ml: 1 }}>
            <AddIcon />
          </IconButton>

        </Toolbar>

        <List>
          {chats.map((chat) => (
            <ListItem button key={chat.model_id} onClick={() => setCurrentChat(chat.model_id)}>
              <ListItemText primary={chat.model_name} />
            </ListItem>
          ))}
        </List>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <AppBar position="fixed">
          <Toolbar>
            <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
              Mirage
            </Typography>
            <IconButton color="inherit" onClick={handleClearChat}>
              <DeleteIcon />
            </IconButton>
          </Toolbar>
        </AppBar>
        <Box sx={{ flexGrow: 1, overflow: 'auto', p: 3, display: 'flex', flexDirection: 'column', position: 'fixed', top: textFromNavbar, left: drawerWidth, right: 0 }}>
          {messages[currentChat]?.map((msg, index) => (
            <Typography key={index} sx={{ textAlign: 'left' }}>{msg.text}</Typography>
          ))}
        </Box>
        <Box sx={{ p: 1, display: 'flex', alignItems: 'center', position: 'fixed', bottom: 0, left: drawerWidth, right: 0 }}>
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
    </Box>
  );
};

export default Dashboard;
