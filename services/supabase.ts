import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://sqlwvjbiququbvnqzvub.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxbHd2amJpcXVxdWJ2bnF6dnViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5OTcxODUsImV4cCI6MjA4MzU3MzE4NX0.Bk66zpHYPjWbqxAKQnT6eUVHzVWAyJ7zPhLKipW4thE';

export const supabase = createClient(supabaseUrl, supabaseKey);