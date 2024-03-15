import express from 'express';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import cors from 'cors';

dotenv.config();

const __dirname = path.resolve();
const app = express();
const PORT = process.env.PORT || 3000;
const RATE_LIMIT = 30;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const openai = new OpenAI();

app.get('/api/chats', async (req, res) => {
  const userId = req.query.userId;

  try {
    const { data: chats, error } = await supabase
      .from('models')
      .select('model_id, model_name')
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    res.json(chats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const rateLimit = async (userId, res) => {
  let { data: existingData } = await supabase
    .from('rate_limit')
    .select('count')
    .eq('user_id', userId)
    .single();

  if (existingData && existingData.count >= RATE_LIMIT) {
    res.status(429).send('Rate limit reached');
    throw Error();
  }

  if (existingData) {
    await supabase
      .from('rate_limit')
      .update({ count: existingData.count + 1 })
      .eq('user_id', userId);
  } else {
    let { error } = await supabase
      .from('rate_limit')
      .insert([{ user_id: userId, count: 1 }]);
    if (error) {
      res.status(401).send('user not authorized');
      throw Error();
    }
  }
};

app.post('/api/send-message', async (req, res) => {
  const { userId, currentChat, userMessage, context, modelId } = req.body;

  if (!userId || currentChat === null || !userMessage || !modelId) {
    return res.status(400).send('Missing required fields');
  }

  try {
    await rateLimit(userId, res);
  } catch (error) {
    return;
  }

  try {
    let query = context.join(' ') + ' ' + userMessage;

    const rag_endpoint = process.env.RAG_ENDPOINT;
    const inferenceRequestBody = {
      query,
      data: '',
      chunk_pages: false,
      user_id: userId,
      model_id: modelId,
      inference: true,
      k: 3,
    };

    const rag_results = await axios.post(rag_endpoint, inferenceRequestBody, {
      headers: {
        Authorization: `Bearer ${process.env.MIRAGE_AUTH_TOKEN_MODAL}`,
        'Content-Type': 'application/json',
      },
    });

    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `Given the following results ${JSON.stringify(
            rag_results.data
          )} and the following query ${userMessage}, with the previous queries sent by the user being ${context}, return the best informed response to the current query with no formatting. 
          Stick to the data as much as possible but interpret where necessary.`,
        },
      ],
      model: 'gpt-4-turbo-preview',
    });

    res.json({ response: completion.choices[0].message.content });
  } catch (error) {
    console.error('Error in /api/send-message:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/api/configure-chat', async (req, res) => {
  const {
    userId,
    name,
    url,
    depth,
    selectedTags,
    baseUrl,
    ignoreFragments,
    chunkPages,
  } = req.body;

  const cleanUp = async (modelData) => {
    if (modelData) {
      try {
        await supabase
          .from('models')
          .delete()
          .eq('model_id', modelData[0].model_id);
      } catch (deleteError) {
        console.error('Cleanup error:', deleteError);
        return res.status(500).send('Failed to clean up after error');
      }
    }
  };

  if (!userId || !name || !url || !depth || !selectedTags) {
    return res.status(400).send('Missing required fields');
  }

  try {
    await rateLimit(userId, res);
  } catch (error) {
    return;
  }

  let modelData;

  try {
    let response = await supabase
      .from('models')
      .insert([{ user_id: userId, model_name: name }])
      .select();

    let { data, error: insertError } = response;

    if (insertError) {
      console.error('Error inserting model:', insertError);
      return res
        .status(insertError.code === '23505' ? 400 : 500)
        .send(
          insertError.code === '23505' ? 'Duplicate' : 'Error inserting model'
        );
    }

    modelData = data;
  } catch (error) {
    console.error('Supabase insertion error:', error);
    return res.status(500).send('Error interacting with the database');
  }

  const scrapeRequestBody = {
    url: url,
    depth: parseInt(depth),
    rules: {
      must_start_with: baseUrl,
      ignore_fragments: ignoreFragments,
      valid_selectors: selectedTags,
    },
  };

  let scrapeData;
  try {
    scrapeData = await axios.post(
      process.env.SCRAPE_ENDPOINT,
      scrapeRequestBody,
      {
        headers: {
          Authorization: `Bearer ${process.env.MIRAGE_AUTH_TOKEN_MODAL}`,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (scrapeError) {
    await cleanUp(modelData);
    console.error('Error in scraping:', scrapeError);

    return scrapeError.response.status === 404
      ? res.status(404).send('Server down')
      : res
          .status(500)
          .send('Error in scraping (potential timeout, decrease depth)');
  }

  const initializeRequestBody = {
    query: '',
    data: scrapeData.data,
    chunk_pages: chunkPages,
    user_id: userId,
    model_id: modelData[0].model_id,
    inference: false,
  };

  try {
    await axios.post(process.env.RAG_ENDPOINT, initializeRequestBody, {
      headers: {
        Authorization: `Bearer ${process.env.MIRAGE_AUTH_TOKEN_MODAL}`,
        'Content-Type': 'application/json',
      },
    });

    res.send({ message: 'Chat configured successfully' });
  } catch (initializeError) {
    await cleanUp(modelData);
    if (initializeError.response && initializeError.response.data) {
      const errorMessage =
        initializeError.response.data.detail ||
        'An error occurred during initialization';
      console.error('Initialization error:', errorMessage);
      return res.status(500).send(errorMessage);
    } else {
      console.error('Initialization error:', initializeError);
      return res.status(500).send('An error occurred during initialization');
    }
  }
});

app.delete('/api/delete-chat', async (req, res) => {
  const { userId, modelId } = req.query;

  try {
    const { error } = await supabase
      .from('models')
      .delete()
      .eq('user_id', userId)
      .eq('model_id', modelId);

    if (error) {
      console.error('Error deleting chat:', error);
      return res.status(500).json({ error: error.message });
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Error deleting chat:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/get-data', async (req, res) => {
  const { userId, modelId } = req.query;

  try {
    const modelData = await axios.get(
      `${process.env.GET_DATA_ENDPOINT}?user_id=${userId}&model_id=${modelId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.MIRAGE_AUTH_TOKEN_MODAL}`,
        },
      }
    );
    return res.status(200).send(modelData.data);
  } catch (getDataError) {
    console.error('Error in getting data:', getDataError);
    return res.status(500).send('Error in getting data');
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
