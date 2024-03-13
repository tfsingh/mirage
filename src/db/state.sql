CREATE TABLE IF NOT EXISTS public.models (
  model_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model_name TEXT,
  UNIQUE(user_id, model_name)
);

CREATE TABLE IF NOT EXISTS public.rate_limit (
  user_id UUID NOT NULL REFERENCES auth.users(id),
  count integer,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id),
  FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

SELECT cron.schedule(
    'Delete old rate_limit entries',
    '0 * * * *',
    $$DELETE FROM public.rate_limit WHERE created_at <= NOW() - INTERVAL '24 HOURS'$$
);