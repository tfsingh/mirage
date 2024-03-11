import React, { useState } from 'react';
import axios from 'axios';
import { Button, TextField, Checkbox, FormControlLabel, FormGroup, Typography, Box, FormControl, FormLabel, Grid } from '@mui/material';
import './App.css';

const Config = () => {
    const [url, setUrl] = useState('');
    const [name, setName] = useState('');
    const [currentView, setCurrentView] = useState('upload');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [baseUrl, setBaseUrl] = useState('');
    const [ignoreFragments, setIgnoreFragments] = useState(false);
    const [depth, setDepth] = useState('');

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

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const token = import.meta.env.VITE_MIRAGE_AUTH_TOKEN_MODAL;
        const scrape_endpoint = import.meta.env.VITE_SCRAPE_ENDPOINT;
        const rag_endpoint = import.meta.env.VITE_RAG_ENDPOINT;

        let data;

        console.log(url, name, selectedTags, baseUrl, ignoreFragments, depth)

        // if (type === "url") {
        //   const requestBody = {
        //     url: url,
        //     depth: parseInt(depth),
        //     rules: {
        //       must_start_with: baseUrl,
        //       ignore_fragments: ignoreFragments,
        //       valid_selectors: selectedTags
        //     }
        //   };

        //   try {
        //     const response = await axios.post(scrape_endpoint, requestBody, {
        //       headers: {
        //         'Authorization': `Bearer ${token}`,
        //         'Content-Type': 'application/json'
        //       }
        //     });
        //     console.log(response.data)
        //     data = response.data;
        //   } catch (error) {
        //     console.error('There was an error!', error);
        //   }
        // } 

        // console.log("Sending next request")
        // const requestBody = {
        //   query: "",
        //   data: data,
        //   chunked: (type === "url") ? true : false,
        //   user_id: 1000, // filler
        //   model_id: 14821 // filler
        // }

        // try {
        //   const response = await axios.post(rag_endpoint, requestBody, {
        //     headers: {
        //       'Authorization': `Bearer ${token}`,
        //       'Content-Type': 'application/json'
        //     }
        //   });
        // } catch (error) {
        //   console.error('There was an error!', error);
        // }
    };

    return (
        <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" m={4}>

            <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" mb={0}>
                <Typography variant="h4" gutterBottom>
                    scraping config
                </Typography>
            </Box>

            <Box display="flex" flexDirection="row" alignItems="flex-start" justifyContent="center">
                <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" mr={4} >
                    <FormControl component="form" onSubmit={handleSubmit} variant="standard" sx={{ width: '100%', maxWidth: '500px' }}>
                        <TextField
                            label="url"
                            variant="outlined"
                            value={url}
                            onChange={handleUrlChange}
                            fullWidth
                            required
                            sx={{ mb: 2 }}
                        />
                        <TextField
                            label="name"
                            variant="outlined"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            fullWidth
                            required
                            sx={{ mb: 2 }}
                        />
                        <TextField
                            label="depth (unique links to scrape)"
                            type="number"
                            variant="outlined"
                            value={depth}
                            onChange={handleDepthChange}
                            fullWidth
                            required
                            inputProps={{ max: 300 }}
                            sx={{ mb: 2 }}
                        />
                        <TextField
                            label="base url"
                            variant="outlined"
                            value={baseUrl}
                            onChange={handleBaseUrlChange}
                            fullWidth
                            sx={{ mb: 2 }}
                        />
                        <FormControlLabel
                            control={<Checkbox checked={ignoreFragments} onChange={handleIgnoreFragmentsChange} />}
                            label="ignore fragments"
                            sx={{ mb: 2 }}
                        />
                        <Button type="submit" variant="contained" color="primary">
                            submit
                        </Button>
                    </FormControl>
                </Box>

                <Box display="flex" flexDirection="column" alignItems="flex-start" justifyContent="center">
                    <FormGroup>
                        <FormLabel>HTML Tags:</FormLabel>
                        {['h1', 'h2', 'h3', 'p', 'code', 'pre', 'div'].map((tag) => (
                            <FormControlLabel
                                key={tag}
                                control={<Checkbox value={tag} checked={selectedTags.includes(tag)} onChange={handleTagChange} />}
                                label={tag}
                            />
                        ))}
                    </FormGroup>
                </Box>
            </Box>
        </Box>
    );
};

export default Config;
