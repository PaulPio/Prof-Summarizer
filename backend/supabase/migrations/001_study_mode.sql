-- Study Mode Database Migration
-- Run this in your Supabase SQL Editor

-- Add new columns for Study Mode features
ALTER TABLE lectures 
ADD COLUMN IF NOT EXISTS cornell_notes JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS flashcards JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS quiz_data JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS confusion_markers INTEGER[] DEFAULT '{}';

-- Add index for faster queries on user's lectures
CREATE INDEX IF NOT EXISTS idx_lectures_user_date 
ON lectures(user_id, date DESC);

-- Comment on new columns
COMMENT ON COLUMN lectures.cornell_notes IS 'Cornell Notes format summary with cues, notes, and summary sections';
COMMENT ON COLUMN lectures.flashcards IS 'Array of flashcard objects with term and definition';
COMMENT ON COLUMN lectures.quiz_data IS 'Array of quiz questions with options, correct index, and explanation';
COMMENT ON COLUMN lectures.confusion_markers IS 'Array of timestamps (in seconds) where student marked as confusing';
