/**
 * Event-Driven Analytics TypeScript Types
 * Mirrors backend Pydantic models for type safety.
 */

export type EventType =
    | "interaction_attempt"
    | "hint_interaction"
    | "level_completed"
    | "language_switch"
    | "game_completed"
    | "game_started";

export type GameMode = "matching" | "quiz";

export type HintType = "long_hint" | "short_hint" | "name";

export interface EventEnvelope {
    event_id: string; // UUID
    event_type: EventType;
    timestamp: string; // ISO 8601
    user_id: string;
    session_id: string;
    game_instance_id: string;
    mode: GameMode;
    language: string;
    level_sequence: number;
    schema_version: number;
}

export interface InteractionAttemptPayload {
    translation_id: string;
    // Matching-specific
    hint_type?: HintType;
    // Quiz-specific
    difficulty_level?: "low" | "medium" | "high" | "very_high";
    question_id?: string;
    selected_answer_id?: string;

    correct: boolean;
    response_time_ms: number;
    attempt_number: number;
}

export interface HintInteractionPayload {
    translation_id: string;
    from_hint_type: HintType;
    to_hint_type: HintType;
    flip_count_for_translation: number;
}

export interface LevelCompletedPayload {
    total_images: number;
    total_questions?: number;
    correct_answers: number;
    accuracy: number;
    total_time_ms: number;
}

export interface LanguageSwitchPayload {
    previous_language: string;
    new_language: string;
    images_replayed: number;
}

export interface GameCompletedPayload {
    total_images: number;
    overall_accuracy: number;
    avg_response_time_ms: number;
    cross_language_played: boolean;
}

export interface GameStartedPayload {
    is_replay: boolean;
    previous_game_instance_id?: string;
    reason?: "first_time" | "retry_after_failure" | "retry_after_completion" | "language_switch";
}

export type EventPayload =
    | InteractionAttemptPayload
    | HintInteractionPayload
    | LevelCompletedPayload
    | LanguageSwitchPayload
    | GameCompletedPayload
    | GameStartedPayload;

export interface GameEvent {
    envelope: EventEnvelope;
    payload: EventPayload;
}
