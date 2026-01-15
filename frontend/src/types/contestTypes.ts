export interface RoundDifficultyDistribution {
    easy: number;
    medium: number;
    hard: number;
}

export interface RoundStructure {
    round_name: string;
    round_seq: number;
    time_limit_seconds: number;
    question_count: number;
    object_count?: number;
    difficulty_distribution: RoundDifficultyDistribution;
}

export interface LevelStructure {
    level_name: string;
    level_seq: number;
    game_type: string; // "matching" or "quiz"
    rounds: RoundStructure[];
}

export interface GameStructure {
    level_count: number;
    levels: LevelStructure[];
}

export interface ScoringDifficultyWeights {
    easy: number;
    medium: number;
    hard: number;
}

export interface ScoringLanguageWeights {
    native: number;
    fluent: number;
    learning: number;
}

export interface TimeBonus {
    enabled: boolean;
    max_bonus: number;
}

export interface ScoringConfig {
    base_points: number;
    negative_marking: number;
    difficulty_weights: ScoringDifficultyWeights;
    language_weights: ScoringLanguageWeights;
    time_bonus: TimeBonus;
    tie_breaker_rules: string[];
}

export interface EligibilityRules {
    min_age: number;
    max_age: number;
    allowed_countries: string[];
    school_required: boolean;
}

export interface VisibilityConfig {
    mode: string;
    allowed_schools: string[];
    invite_only: boolean;
}

export interface ParticipationRewards {
    certificate: boolean;
    badge?: string;
}

export interface RankBasedReward {
    rank_from: number;
    rank_to: number;
    reward: string;
}

export interface RewardsConfig {
    participation: ParticipationRewards;
    rank_based: RankBasedReward[];
}

export interface Contest {
    _id?: string;
    id?: string; // Handle both _id and id for compatibility
    name: { [key: string]: string }; // MultilingualStr
    description: { [key: string]: string }; // MultilingualStr
    status: string;
    contest_type: string;
    supported_languages: string[];
    areas_of_interest?: string[];
    org_id?: string;

    content_type: string;
    specialized_theme?: string;
    specialized_org_id?: string;

    registration_start_at: string;
    registration_end_at: string;
    contest_start_at: string;
    contest_end_at: string;
    grace_period_seconds: number;

    max_participants: number;

    eligibility_rules: EligibilityRules;

    game_structure: GameStructure;

    scoring_config: ScoringConfig;

    visibility: VisibilityConfig;

    rewards: RewardsConfig;

    created_by: string;
    created_at: string;
    config_locked_at?: string;
}

export interface LeaderboardEntry {
    rank: number;
    username: string;
    total_score: number;
    language_scores: { [key: string]: number };
    language_times: { [key: string]: number };
    is_current_user: boolean;
}

export interface LeaderboardResponse {
    entries: LeaderboardEntry[];
    average_time_all_participants: number;
}
