import React, { useState } from 'react';
import axios from 'axios';
import { AppBar, Button, TextField, Checkbox, FormControlLabel, FormGroup, Typography, Box, FormControl, FormLabel, Tooltip, Container, LinearProgress } from '@mui/material';
import './App.css';
import Snackbar, { SnackbarOrigin } from '@mui/material/Snackbar';

const Config = ({ supabase, session, refreshDash }) => {
    const [url, setUrl] = useState('');
    const [name, setName] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [baseUrl, setBaseUrl] = useState('');
    const [ignoreFragments, setIgnoreFragments] = useState(false);
    const [chunkPages, setChunkPages] = useState(false);
    const [scraping, setScraping] = useState(false);
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

    const handleChunkPagesChange = () => {
        setChunkPages(!chunkPages);
    };

    const handleDepthChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setDepth(event.target.value);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setScraping(true);
        const userId = session.user.id;

        if (userId === "" || name === "" || url === "" || depth === null) {
            console.error("Required data not present");
            setScraping(false);
            return;
        }

        let tagsToSend = selectedTags;
        let urlToSend = url;
        let baseUrlToSend = baseUrl;

        if (selectedTags.length === 0) {
            tagsToSend = ['p']
        }

        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            urlToSend = 'https://' + url;
        }

        if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
            baseUrlToSend = 'https://' + baseUrl;
        }

        try {
            const response = await axios.post('/api/configure-chat', {
                userId,
                name,
                url: urlToSend,
                depth,
                selectedTags: tagsToSend,
                baseUrl: baseUrlToSend,
                ignoreFragments,
                chunkPages
            });

            if (response.data && response.data.message) {
                refreshDash()
            }
        } catch (error) {
            console.error('There was an error:', error);
            let messageToDisplay;
            if (error.response && error.response.status === 400) {
                console.log(error.response)
                messageToDisplay = "Duplicate not allowed";
            } else if (error.response && error.response.data && error.response.data != "Internal Server Error") {
                messageToDisplay = error.response.data;
            } else {
                messageToDisplay = "Error configuring chat";
            }
            setSnackbarMessage(messageToDisplay)
            setState({ ...state, open: true });
        }
        setScraping(false);
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
                        alignItems: 'center', justifyContent: 'center', width: '100%', bgcolor: '#9ab08f', height: '13%'
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
                                    <Tooltip
                                        title="ignore in page links (url#section)"
                                        placement="left"
                                        PopperProps={{
                                            modifiers: [
                                                {
                                                    name: 'offset',
                                                    options: {
                                                        offset: [0, -22],
                                                    },
                                                },
                                            ],
                                        }}
                                    >
                                        <FormControlLabel
                                            control={<Checkbox size="small" checked={ignoreFragments} onChange={handleIgnoreFragmentsChange} />}
                                            label="ignore fragments"
                                            sx={{ mb: -1 }}
                                        />
                                    </Tooltip>


                                    <Tooltip
                                        title="divide pages into smaller chunks for indexing"
                                        placement="left"
                                        PopperProps={{
                                            modifiers: [
                                                {
                                                    name: 'offset',
                                                    options: {
                                                        offset: [0, -22],
                                                    },
                                                },
                                            ],
                                        }}
                                    >
                                        <FormControlLabel
                                            control={<Checkbox size="small" checked={chunkPages} onChange={handleChunkPagesChange} />}
                                            label="chunk pages"
                                            sx={{ mb: 0.5 }}
                                        />
                                    </Tooltip>

                                    {scraping ? <Box sx={{ mt: 1.5, color: '#3a4037' }}><LinearProgress color='inherit' /> </Box> : <Button type="submit" variant="contained" sx={{
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
                                    </Button>}
                                </FormControl>
                            </Box>

                            <Box sx={{ backgroundColor: 'white', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', p: 1, bgcolor: '#F2F1E9' }}>
                                <FormGroup>
                                    <FormLabel component="legend">tags to scrape:</FormLabel>
                                    {['h1', 'h2', 'h3', 'p', 'code', 'li', 'textarea', 'table', 'div'].map((tag) => (
                                        <FormControlLabel
                                            key={tag}
                                            control={<Checkbox size="small" value={tag} checked={selectedTags.includes(tag)} onChange={handleTagChange} />}
                                            label={tag}
                                            sx={{ margin: 0, padding: 0, mb: -1 }}
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
