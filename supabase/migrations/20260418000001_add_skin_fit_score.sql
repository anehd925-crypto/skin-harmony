ALTER TABLE analysis_history
  ADD COLUMN IF NOT EXISTS skin_fit_score smallint;

ALTER TABLE my_cabinet
  ADD COLUMN IF NOT EXISTS my_rating smallint CHECK (my_rating >= 1 AND my_rating <= 5),
  ADD COLUMN IF NOT EXISTS my_review text;
