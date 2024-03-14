import React, { useEffect, useRef, useState } from 'react';
import { Box, List, ListItem, ListItemText, TextField, AppBar, Toolbar, Typography, IconButton, Container, Tooltip, CircularProgress } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SendIcon from '@mui/icons-material/Send';
import LogoutIcon from '@mui/icons-material/Logout';
import Config from './Config';
import { MeshGradientRenderer } from '@johnn-e/react-mesh-gradient';
import { createClient } from '@supabase/supabase-js'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeMinimal } from '@supabase/auth-ui-shared'
import Snackbar, { SnackbarOrigin } from '@mui/material/Snackbar';
import axios from 'axios';

interface Chat {
  model_name: string;
  model_id: number;
}

interface Message {
  text: string;
  timestamp: Date;
  isResponse: boolean;
}

const supabase = createClient(import.meta.env.VITE_SUPABASE_ENDPOINT, import.meta.env.VITE_SUPABASE_KEY)

const Dashboard = () => {
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChat, setCurrentChat] = useState<number | null>(null);
  const [currentMessage, setCurrentMessage] = useState('');
  const [messages, setMessages] = useState<Record<number, Message[]>>({});
  const [showConfig, setShowConfig] = useState(false);
  const [session, setSession] = useState(null)
  const [inferring, setInferring] = useState(false)
  const [state, setState] = React.useState<State>({
    open: false,
    vertical: 'top',
    horizontal: 'center',
  });
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const { vertical, horizontal, open } = state;

  const handleClick = (newState: SnackbarOrigin) => () => {
    setState({ ...newState, open: true });
  };

  const handleClose = () => {
    setState({ ...state, open: false });
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      const fetchChats = async () => {
        try {
          const response = await axios.get('/api/chats', { params: { userId: session.user.id } });
          setChats(response.data.reverse());
          setCurrentChat(response.data[0]?.model_id || null);
        } catch (error) {
          console.error('Error fetching chats:', error.message);
        }
      };
      setCurrentChat(getSavedCurrentChat(session.user.id));
      setMessages(getStoredMessages(session.user.id));
      fetchChats();
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        setCurrentChat(getSavedCurrentChat(session.user.id));
        setMessages(getStoredMessages(session.user.id));
      } else {
        setCurrentChat(null);
        setMessages({});
      }
    });

    return () => subscription.unsubscribe();

  }, [showConfig]);

  useEffect(() => {
    if (messagesContainerRef.current) {
      const { scrollHeight, clientHeight } = messagesContainerRef.current;
      messagesContainerRef.current.scrollTop = scrollHeight - clientHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (session && currentChat !== null) {
      localStorage.setItem(`current_chat_${session.user.id}`, JSON.stringify(currentChat));
    }
  }, [currentChat, session]);

  const getSavedCurrentChat = (userId) => {
    const savedCurrentChat = localStorage.getItem(`current_chat_${userId}`);
    return savedCurrentChat ? JSON.parse(savedCurrentChat) : chats[0]?.model_id || null;
  };

  const getStoredMessages = (userId) => {
    const storedMessages = localStorage.getItem(`chat_messages_${userId}`);
    return storedMessages ? JSON.parse(storedMessages) : {};
  };



  const handleSendMessage = async () => {
    if (!session || currentChat === null) return;

    const timestamp = new Date();
    const newMessage = { text: currentMessage, timestamp, isResponse: false };

    const updateMessages = (newMessages) => {
      setMessages(newMessages);
      localStorage.setItem(`chat_messages_${session.user.id}`, JSON.stringify(newMessages));
    };

    const updatedMessages = {
      ...messages,
      [currentChat]: [...(messages[currentChat] || []), newMessage],
    };
    updateMessages(updatedMessages);
    setCurrentMessage('');

    setInferring(true);

    try {
      const { data: { response } } = await axios.post('/api/send-message', {
        userId: session.user.id,
        currentChat,
        userMessage: currentMessage,
        modelId: chats.find(chat => chat.model_id === currentChat)?.model_id,
      });

      const responseMessage = { text: response, timestamp, isResponse: true };
      const updatedMessagesWithResponse = {
        ...updatedMessages,
        [currentChat]: [...updatedMessages[currentChat], responseMessage],
      };
      updateMessages(updatedMessagesWithResponse);
    } catch (error) {
      console.error('Error sending message:', error);
      setSnackbarMessage("Error sending message");
      setState((prevState) => ({ ...prevState, open: true }));
    }

    setInferring(false);
  };


  const handleClearChat = () => {
    if (!session) return;
    const updatedMessages = { ...messages, [currentChat!]: [] };
    setMessages(updatedMessages);
    localStorage.setItem(`chat_messages_${session.user.id}`, JSON.stringify(updatedMessages));
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  const refreshDash = () => {
    setShowConfig(false);
    //window.location.reload();
  }

  const gradient = (
    <Container
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        minWidth: '100vw',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'stretch',
        zIndex: -1,
      }}
      sx={{ ml: -3 }}
    >
      <MeshGradientRenderer
        className="gradient"
        style={{ width: '100%', height: '100%' }}
        colors={[
          "#e3ccc5",
          "#d1afa3",
          "#ebd5c0",
          "#e6d5c3",
          "#e6dac3"
        ]}
      />
    </Container >
  );

  if (showConfig) {
    return <>
      {gradient}
      <Config supabase={supabase} session={session} refreshDash={refreshDash} />
    </>;
  }

  return (
    <Container>
      <Snackbar
        open={open}
        autoHideDuration={3000}
        onClose={handleClose}
        message={snackbarMessage}
        key={vertical + horizontal}
      />
      {gradient}
      <Box sx={{ display: 'flex', height: '92vh', flexDirection: 'column', m: 0 }}>
        <AppBar position="static" sx={{ bgcolor: '#9ab08f', m: 0 }}>
          <Toolbar sx={{ m: 0, p: 0 }}>
            <div style={{ flexGrow: 1 }}></div>

            <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, fontSize: '28px', display: 'flex', justifyContent: 'center', ml: '90px', color: '#3a4037' }}>
              mirage
            </Typography>

            <div style={{ flexGrow: 1 }}></div>

            {
              session ? (
                <>
                  <IconButton onClick={handleClearChat}>
                    <Tooltip title="clear chat" placement="top">
                      <DeleteIcon />
                    </Tooltip>
                  </IconButton>
                  <IconButton onClick={() => setShowConfig(true)}>
                    <Tooltip title="new chat" placement="top">
                      <AddIcon />
                    </Tooltip>
                  </IconButton>
                  <IconButton onClick={() => handleSignOut()}>
                    <Tooltip title="logout" placement="top">
                      <LogoutIcon />
                    </Tooltip>
                  </IconButton>
                </>
              ) : (
                <Auth
                  supabaseClient={supabase}
                  providers={['google']}
                  appearance={{ theme: ThemeMinimal }}
                  onlyThirdPartyProviders={true}
                />
              )
            }


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
                <Typography
                  key={index}
                  sx={{
                    textAlign: 'left',
                    overflowWrap: 'break-word',
                    mb: 1,
                    bgcolor: msg.isResponse ? 'rgba(0, 0, 0, 0.05)' : 'transparent',
                    p: msg.isResponse ? 1 : 0,
                  }}
                >
                  {msg.text}
                </Typography>
              ))}
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', p: 1, bgcolor: '#F2F1E9', color: 'grey' }}>
              <TextField
                fullWidth
                variant="outlined"
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                placeholder="Type your message here..."
                sx={{ mr: 1 }}
              />
              {inferring ? <CircularProgress color='inherit' /> : <IconButton color="primary" onClick={handleSendMessage}>
                <SendIcon sx={{ color: 'grey' }} />
              </IconButton>}
            </Box>
          </Box>
        </Box>
      </Box>
    </Container>
  );
};

export default Dashboard;
