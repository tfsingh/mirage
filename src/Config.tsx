import React, { useState } from 'react';
import axios from 'axios';
import { AppBar, Button, TextField, Checkbox, FormControlLabel, FormGroup, Typography, Box, FormControl, FormLabel, Tooltip, Container } from '@mui/material';
import './App.css';
import Snackbar, { SnackbarOrigin } from '@mui/material/Snackbar';
import { SupabaseClient } from '@supabase/supabase-js';


const Config = ({ supabase, session }) => {
    const [url, setUrl] = useState('');
    const [name, setName] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [baseUrl, setBaseUrl] = useState('');
    const [ignoreFragments, setIgnoreFragments] = useState(false);
    const [depth, setDepth] = useState('1');
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

    const handleUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setUrl(event.target.value);
    };

    const handleTagChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const tag = event.target.value;
        setSelectedTags((tags) =>
            tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag]
        );
    };

    const handleBaseUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setBaseUrl(event.target.value);
    };

    const handleIgnoreFragmentsChange = () => {
        setIgnoreFragments(!ignoreFragments);
    };

    const handleDepthChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setDepth(event.target.value);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        const userId = session.user.id;

        if (!userId || !name || !url || !depth || !selectedTags) {
            console.error("Required data not present");
            return;
        }

        try {
            const response = await axios.post('/api/configure-chat', {
                userId,
                name,
                url,
                depth,
                selectedTags,
                baseUrl,
                ignoreFragments,
            });

            if (response.data && response.data.message) {
                console.log(response.data.message);

            }
        } catch (error) {
            console.error('There was an error:', error);
            let messageToDisplay = error.response.status === 400 ? "Duplicate not allowed" : "Error configuring chat"
            setSnackbarMessage(messageToDisplay)
            setState({ ...state, open: true });
        }
    };

    return (
        <Container>
            <Snackbar
                open={open}
                autoHideDuration={3000}
                onClose={handleClose}
                message={snackbarMessage}
                key={vertical + horizontal}
            />
            <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                <Box sx={{ backgroundColor: 'white', maxWidth: '600px', margin: '0 auto', width: 'auto', bgcolor: '#F2F1E9' }}>
                    <AppBar position="static" color="default" sx={{
                        alignItems: 'center', justifyContent: 'center', width: '100%', bgcolor: '#9ab08f', height: '15%'
                    }}>
                        <Typography variant="h6" gutterBottom sx={{ mt: 1.5, fontSize: '28px', color: '#3a4037' }}>
                            new chat
                        </Typography>
                    </AppBar>

                    <Box sx={{ display: 'flex', justifyContent: 'center', bgcolor: '#F2F1E9' }}>
                        <Box sx={{
                            backgroundColor: 'white', display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', p: 1, width: '100%', bgcolor: '#F2F1E9'
                        }}>
                            < Box sx={{ backgroundColor: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', mr: 2, p: 1, bgcolor: '#F2F1E9' }}>
                                <FormControl component="form" onSubmit={handleSubmit} variant="standard" sx={{ width: '100%', bgcolor: '#F2F1E9' }}>
                                    <TextField
                                        label="chat name"
                                        variant="outlined"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        fullWidth
                                        required
                                        size="small"
                                        sx={{ mb: 1 }}
                                        inputProps={{ maxLength: 20 }}
                                    />
                                    <TextField
                                        label="url"
                                        variant="outlined"
                                        value={url}
                                        onChange={handleUrlChange}
                                        fullWidth
                                        required
                                        size="small"
                                        sx={{ mb: 1 }}
                                    />
                                    <Tooltip
                                        title="unique links to scrape"
                                        placement="left"
                                        PopperProps={{
                                            modifiers: [
                                                {
                                                    name: 'offset',
                                                    options: {
                                                        offset: [0, -10],
                                                    },
                                                },
                                            ],
                                        }}
                                    >
                                        <TextField
                                            label="depth"
                                            type="number"
                                            variant="outlined"
                                            value={depth}
                                            onChange={handleDepthChange}
                                            fullWidth
                                            required
                                            size="small"
                                            inputProps={{ min: 1, max: 300 }}
                                            sx={{ mb: 1 }}
                                        />
                                    </Tooltip>

                                    <Tooltip
                                        title="url to restrict scraping to"
                                        placement="left"
                                        PopperProps={{
                                            modifiers: [
                                                {
                                                    name: 'offset',
                                                    options: {
                                                        offset: [0, -10],
                                                    },
                                                },
                                            ],
                                        }}
                                    >
                                        <TextField
                                            label="base url"
                                            variant="outlined"
                                            value={baseUrl}
                                            onChange={handleBaseUrlChange}
                                            fullWidth
                                            size="small"
                                            sx={{ mb: 0.5 }}
                                        />
                                    </Tooltip>
                                    <FormControlLabel
                                        control={<Checkbox size="small" checked={ignoreFragments} onChange={handleIgnoreFragmentsChange} />}
                                        label="ignore fragments"
                                        sx={{ mb: 0.5 }}
                                    />

                                    <Button type="submit" variant="contained" sx={{
                                        bgcolor: '#9ab08f',
                                        color: '#3a4037',
                                        textTransform: 'lowercase',
                                        fontSize: '18px',
                                        '&:hover': {
                                            bgcolor: '#9ab08f',
                                            color: '#3a4037',
                                        }
                                    }}>
                                        submit
                                    </Button>
                                </FormControl>
                            </Box>

                            <Box sx={{ backgroundColor: 'white', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', p: 1, bgcolor: '#F2F1E9' }}>
                                <FormGroup>
                                    <FormLabel component="legend">tags to scrape:</FormLabel>
                                    {['h1', 'h2', 'h3', 'p', 'code', 'li', 'table'].map((tag) => (
                                        <FormControlLabel
                                            key={tag}
                                            control={<Checkbox size="small" value={tag} checked={selectedTags.includes(tag)} onChange={handleTagChange} />}
                                            label={tag}
                                            sx={{ margin: 0, padding: 0 }}
                                        />
                                    ))}
                                </FormGroup>
                            </Box>
                        </Box>
                    </Box>
                </Box>
            </Box >
        </Container >
    );
};

export default Config;
