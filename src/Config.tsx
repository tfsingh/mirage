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
        console.log(event)
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

    const cleanUp = async (model_id: string) => {
        console.log(model_id)
        const { error } = await supabase.from('models').delete().eq('model_id', model_id)

        if (error) {
            console.error("Error in cleanup", error);
        }
    }

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const token = import.meta.env.VITE_MIRAGE_AUTH_TOKEN_MODAL;
        const scrape_endpoint = import.meta.env.VITE_SCRAPE_ENDPOINT;
        const rag_endpoint = import.meta.env.VITE_RAG_ENDPOINT;
        let scrape_data;

        if (selectedTags.length === 0) {
            setSelectedTags(['p']);
        }

        if (!url || !name || !depth || !selectedTags) {
            console.error("Required data not present")
            return
        }

        let { data, error } = await supabase
            .from('models')
            .insert([
                { user_id: session.user.id, model_name: name }
            ]).select();

        if (error || data === null) {
            console.error('Error inserting model:', error);
            if (error.code === '23505') {
                setSnackbarMessage("Duplicate model name not allowed");
                setState({ ...state, open: true });
                return;
            }
            return;
        }

        data = data[0];

        const scrapeRequestBody = {
            url: url,
            depth: parseInt(depth),
            rules: {
                must_start_with: baseUrl,
                ignore_fragments: ignoreFragments,
                valid_selectors: selectedTags
            }
        };

        try {
            const response = await axios.post(scrape_endpoint, scrapeRequestBody, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            console.log(response.data)
            scrape_data = response.data;
        } catch (error) {
            console.error('There was an error!', error);
            cleanUp(data.model_id)
            return
        }

        const initializeRequestBody = {
            query: "",
            data: scrape_data,
            chunked: true,
            user_id: data.user_id,
            model_id: data.model_id,
        }

        try {
            const response = await axios.post(rag_endpoint, initializeRequestBody, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            console.error('There was an error!', error);
            cleanUp(data.model_id)
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
