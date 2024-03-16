import React, { useEffect, useRef, useState } from 'react';
import Config from './Config';
import { MeshGradientRenderer } from '@johnn-e/react-mesh-gradient';
import { createClient } from '@supabase/supabase-js'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeMinimal } from '@supabase/auth-ui-shared'
import axios from 'axios';
import {
  Box, List, ListItem, ListItemText, AppBar, Toolbar, Typography,
  IconButton, Container, Tooltip, CircularProgress, OutlinedInput
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SendIcon from '@mui/icons-material/Send';
import LogoutIcon from '@mui/icons-material/Logout';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import Snackbar from '@mui/material/Snackbar';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';

interface Chat {
  model_name: string;
  model_id: number;
}

interface Message {
  text: string;
  timestamp: Date;
  isResponse: boolean;
}

interface SnackbarState {
  open: boolean;
  vertical: 'top' | 'bottom';
  horizontal: 'left' | 'center' | 'right';
}

const supabase = createClient(import.meta.env.VITE_SUPABASE_ENDPOINT, import.meta.env.VITE_SUPABASE_KEY)
const endpoint = import.meta.env.VITE_BACKEND_ENDPOINT

const Dashboard = () => {
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // user
  const [session, setSession] = useState(null)

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  // chat interface
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChat, setCurrentChat] = useState<number | null>(null);
  const [currentMessage, setCurrentMessage] = useState('');
  const [messages, setMessages] = useState<Record<number, Message[]>>({});
  const [showConfig, setShowConfig] = useState(false);
  const [inferring, setInferring] = useState(false);

  const handleClearChat = () => {
    if (!session) return;
    const updatedMessages: React.SetStateAction<Record<number, Message[]>> = { ...messages, [currentChat!]: [] };
    setMessages(updatedMessages);
    localStorage.setItem(`chat_messages_${session.user.id}`, JSON.stringify(updatedMessages));
  };

  const refreshDash = () => {
    setShowConfig(false);
  }

  const handleSendMessage = async () => {
    if (!session || currentChat === null) return;

    if (currentMessage === '') {
      showSnackbar("please enter a query")
      return
    }

    const timestamp = new Date();
    const newMessage = { text: currentMessage, timestamp, isResponse: false };

    let context: string[] = []
    if (messages[currentChat]) {
      const prevMessages = messages[currentChat].filter(message => !message.isResponse).slice(-3);
      context = prevMessages.map(message => message.text)
    }

    const updateMessages = (newMessages: React.SetStateAction<Record<number, Message[]>>) => {
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
      const { data: { response } } = await axios.post(endpoint + '/api/send-message', {
        userId: session.user.id,
        currentChat,
        userMessage: currentMessage,
        context,
        modelId: chats.find(chat => chat.model_id === currentChat)?.model_id,
      });

      const responseMessage = { text: response, timestamp, isResponse: true };
      const updatedMessagesWithResponse = {
        ...updatedMessages,
        [currentChat]: [...updatedMessages[currentChat], responseMessage],
      };
      updateMessages(updatedMessagesWithResponse);
    } catch (error: any) {
      const messageToDisplay = error.response.status === 429 ? "rate limit reached" : "error generating response";
      showSnackbar(messageToDisplay)
    }

    setInferring(false);
  };

  // menu
  const [anchorEl, setAnchorEl] = useState(null);
  const [chatFromMenu, setChatFromMenu] = useState(null);
  const [dataDialogOpen, setDataDialogOpen] = useState(false);
  const [dataToShow, setDataToShow] = useState('');

  const handleDeleteChat = async (modelId: number) => {
    try {
      await axios.delete(endpoint + '/api/delete-chat', { params: { userId: session.user.id, modelId } });
      setChats(chats.filter((chat) => chat.model_id !== modelId));
      setMessages((prevMessages) => {
        const updatedMessages = { ...prevMessages };
        delete updatedMessages[modelId];
        return updatedMessages;
      });
      setAnchorEl(null);
      setChatFromMenu(null);
    } catch (error) {
      showSnackbar('error deleting chat')
    }
  };

  const handleSeeData = async (modelId: number) => {
    try {
      setAnchorEl(null);
      setChatFromMenu(null);
      const data = await axios.get(endpoint + '/api/get-data', { params: { userId: session.user.id, modelId } });
      setDataToShow(data.data.join('\n------------------------------\n'));
      setDataDialogOpen(true);
    } catch (error) {
      showSnackbar('error getting data')
    }
  };

  // snackbar
  const [state, setState] = React.useState<SnackbarState>({
    open: false,
    vertical: 'top',
    horizontal: 'center',
  });
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const { vertical, horizontal, open } = state;

  const handleClose = () => {
    setState({ ...state, open: false });
  };

  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setState((prevState) => ({ ...prevState, open: true }));
  }

  // initialization
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      const fetchChats = async () => {
        try {
          const response = await axios.get(endpoint + '/api/chats', { params: { userId: session.user.id } });
          setChats(response.data.reverse());
          setCurrentChat(response.data[0]?.model_id || null);
        } catch (error: any) {
          // console.error('Error fetching chats:', error.message);
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

  const getSavedCurrentChat = (userId: string) => {
    const savedCurrentChat = localStorage.getItem(`current_chat_${userId}`);
    return savedCurrentChat ? JSON.parse(savedCurrentChat) : chats[0]?.model_id || null;
  };

  const getStoredMessages = (userId: string) => {
    const storedMessages = localStorage.getItem(`chat_messages_${userId}`);
    return storedMessages ? JSON.parse(storedMessages) : {};
  };

  const gradient = (
    <Container
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        minWidth: '105vw',
        minHeight: '105vh',
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

  const snackbar = <Snackbar
    open={open}
    autoHideDuration={3000}
    onClose={handleClose}
    message={snackbarMessage}
    key={vertical + horizontal}
  />

  if (showConfig) {
    return <>
      {snackbar}
      {gradient}
      <Config session={session} refreshDash={refreshDash} showSnackbar={showSnackbar} endpoint={endpoint} />
    </>;
  }

  return (
    <Container>
      {snackbar}
      {gradient}
      <Box sx={{ display: 'flex', height: '92vh', flexDirection: 'column', m: 0 }}>
        <AppBar position="static" sx={{ bgcolor: '#9ab08f', m: 0, minHeight: '40px' }}>
          <Toolbar sx={{ m: 0, p: 0 }}>
            <Box sx={{
              display: 'flex',
              flexDirection: 'column',
              m: 0,
              mt: -1,
              ml: -2,
              pl: { xs: 0, sm: 0 },
              overflowX: 'hidden'
            }}>
              <Typography variant="h6" noWrap component="div" sx={{
                fontSize: { xs: '20px', sm: '28px' },
                display: 'flex',
                justifyContent: 'center',
                color: '#3a4037'
              }}>
                mirage
              </Typography>
              <Typography variant="body2" noWrap component="div" sx={{
                ml: 1,
                mt: -1,
                fontSize: '12px',
                display: 'flex',
                justifyContent: 'center',
                color: '#3a4037',
                pl: { xs: 3, sm: 0 }
              }}>
                chat with the web
              </Typography>
            </Box>

            <div style={{ flexGrow: 1 }}></div>
            <Box sx={{ mr: { xs: 1, sm: -1.5 } }}>
              {
                session ? (
                  <>
                    <IconButton onClick={handleClearChat}>
                      <Tooltip title="clear chat/context" placement="top">
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
            </Box>


          </Toolbar>
        </AppBar>

        <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden', boxShadow: 4 }}>
          <List sx={{ minWidth: '20%', overflowY: 'auto', bgcolor: '#BCC6BC', m: 0, mt: -1 }}>
            {//@ts-ignore
              chats.map((chat, i) => (
                <ListItem
                  button
                  key={chat.model_id}
                  onClick={() => setCurrentChat(chat.model_id)}
                  sx={{
                    bgcolor: currentChat === chat.model_id ? 'rgba(0, 0, 0, 0.1)' : 'inherit',
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setAnchorEl(e.currentTarget);
                    setChatFromMenu(chat.model_id);
                  }}
                >
                  <ListItemText primary={chat.model_name} />
                </ListItem>
              ))}
          </List>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => {
              setAnchorEl(null);
              setChatFromMenu(null);
            }}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            sx={{
              '& .MuiPaper-root': {
                backgroundColor: '#BCC6BC',
                boxShadow: '0px 2px 5px rgba(0, 0, 0, 0.2)',
                padding: '0',
                minWidth: 'auto',
                overflowY: 'hidden',
              },
            }}
          >
            <MenuItem onClick={() => handleDeleteChat(chatFromMenu)}>delete chat</MenuItem>
            <MenuItem onClick={() => handleSeeData(chatFromMenu)}>see data</MenuItem>
          </Menu>
          <Dialog
            open={dataDialogOpen}
            onClose={() => setDataDialogOpen(false)}
            aria-labelledby="data-dialog-title"
            aria-describedby="data-dialog-description"
            maxWidth="md"
            fullWidth
          >
            <DialogContent>
              <pre style={{ whiteSpace: 'pre-wrap' }}>{dataToShow}</pre>
            </DialogContent>
          </Dialog>
          <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            <Box
              sx={{
                flexGrow: 1, overflow: 'auto', p: 3, bgcolor: '#F2F1E9',
                whiteSpace: 'pre-wrap', wordBreak: 'break-word', mb: -3, mt: -1
              }}
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
              <OutlinedInput
                multiline
                maxRows={6}
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                placeholder="type your message here..."
                sx={{
                  width: '100%',
                  mr: 1,
                  ml: 1,
                  mb: 1
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              {inferring ? <CircularProgress color='inherit' /> :
                <IconButton color="primary" onClick={handleSendMessage}>
                  <SendIcon sx={{ color: 'grey' }} />
                </IconButton>}
            </Box>
          </Box>
        </Box>
      </Box>
    </Container >
  );
};

export default Dashboard;
