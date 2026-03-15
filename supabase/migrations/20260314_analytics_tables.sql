-- Analytics module tables: financial_health_scores, achievements, user_achievements, weekly_recaps, year_reviews

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- financial_health_scores
CREATE TABLE IF NOT EXISTS financial_health_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    overall_score INT NOT NULL DEFAULT 0,
    budget_adherence_score INT NOT NULL DEFAULT 0,
    savings_rate_score INT NOT NULL DEFAULT 0,
    debt_health_score INT NOT NULL DEFAULT 0,
    expense_consistency_score INT NOT NULL DEFAULT 0,
    goal_progress_score INT NOT NULL DEFAULT 0,
    tips TEXT,
    period VARCHAR(10) NOT NULL,
    calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_financial_health_scores_user_period ON financial_health_scores(user_id, period);

-- achievements
CREATE TABLE IF NOT EXISTS achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    icon VARCHAR(100),
    points INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_achievements_code ON achievements(code);

-- user_achievements
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);

-- weekly_recaps
CREATE TABLE IF NOT EXISTS weekly_recaps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    week_start DATE NOT NULL,
    summary JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_weekly_recaps_user_week ON weekly_recaps(user_id, week_start);

-- year_reviews
CREATE TABLE IF NOT EXISTS year_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    year INT NOT NULL,
    summary JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, year)
);

CREATE INDEX IF NOT EXISTS idx_year_reviews_user_year ON year_reviews(user_id, year);
